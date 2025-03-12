from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend
import base64
import json

from config import PRIVATE_KEY

def encrypt_with_public_key(message: str, public_key_str: str) -> str:
    """
    使用公钥分块加密
    """
    try:
        # 将PEM格式的公钥字符串转换为公钥对象
        public_key = serialization.load_pem_public_key(
            public_key_str.encode('utf-8'),
            backend=default_backend()
        )
        
        # 将消息转换为字节
        message_bytes = message.encode('utf-8')
        
        # 计算块大小(考虑OAEP padding)
        block_size = 62  # 1024位密钥使用OAEP时的最大块大小 llm给的事86，但是86报错，测试下来62最合适
        
        # 分块加密
        encrypted_blocks = []
        for i in range(0, len(message_bytes), block_size):
            block = message_bytes[i:i + block_size]
            encrypted_block = public_key.encrypt(
                block,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None
                )
            )
            encrypted_blocks.append(encrypted_block)
        
        # 合并加密后的块
        encrypted = b''.join(encrypted_blocks)
        
        # 将加密后的字节转换为base64字符串
        return base64.b64encode(encrypted).decode('utf-8')
    except Exception as e:
        print(f"加密失败: {str(e)}")
        raise

def decrypt_with_private_key(encrypted_message: str, private_key_str: str = "") -> str:
    """
    使用私钥分块解密
    """
    try:
        if private_key_str == "":
            private_key_str = PRIVATE_KEY
        # 将PEM格式的私钥字符串转换为私钥对象
        private_key = serialization.load_pem_private_key(
            private_key_str.encode('utf-8'),
            password=None,
            backend=default_backend()
        )
        
        # 将base64字符串转换回字节
        encrypted_bytes = base64.b64decode(encrypted_message.encode('utf-8'))
        
        # 计算每个加密块的大小(1024位RSA密钥的加密块大小为128字节)
        block_size = 128
        
        # 分块解密
        decrypted_blocks = []
        for i in range(0, len(encrypted_bytes), block_size):
            block = encrypted_bytes[i:i + block_size]
            decrypted_block = private_key.decrypt(
                block,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None
                )
            )
            decrypted_blocks.append(decrypted_block)
        
        # 合并解密后的块
        decrypted = b''.join(decrypted_blocks)
        
        # 将解密后的字节转换为字符串
        return decrypted.decode('utf-8')
    except Exception as e:
        raise Exception(f"解密失败: {str(e)}")

# 使用示例
def main():
    # 示例公钥和私钥（实际使用时应该从文件或其他安全的地方获取）
    public_key_str = """-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDsPkL+LYRVzjk1647zF/WQldb7G10SsIxRKl+nJzFNe20x+6K7/RYnXPLmGCyAeAV0hIcnWDLupT9xm4dI+I4J3Pyo+Glrt7C8IGA0MAwyDHO9zE5ztA4ce1V+PrwFqR+bAkGFTZemH21qRvBnkdzJuBVSOWziCK2QKQyqCB88RwIDAQAB
-----END PUBLIC KEY-----
"""
    
    private_key_str = """-----BEGIN PRIVATE KEY-----
MIICdwIBADANBgkqhkiG9w0BAQEFAASCAmEwggJdAgEAAoGBAOw+Qv4thFXOOTXrjvMX9ZCV1vsbXRKwjFEqX6cnMU17bTH7orv9Fidc8uYYLIB4BXSEhydYMu6lP3Gbh0j4jgnc/Kj4aWu3sLwgYDQwDDIMc73MTnO0Dhx7VX4+vAWpH5sCQYVNl6YfbWpG8GeR3Mm4FVI5bOIIrZApDKoIHzxHAgMBAAECgYBjQ3IAvP1a1HDjgBurdwi+fMc88W11GeuLeyN/547mwJLMKrBhDuGNHpgNKGEihcu8/qaPWJbmAVccFD6O4alEGwPEharDiVo2J+1JMjvUHfkYiadVz8E0vMOj/9koQF3D5aGQa/JyxZdWbj3387sy6yWXmwq71vsE3+ePpNE4QQJBAPfrwm/64+xnL8aDkhhnnYFdRPBcJIywzRmCc9mT7qZek4u01ctBA3hFpqfrfPQG9tdojXyk33V/afajvhtcKWECQQDz8RUmuNYNOJPHF7PYEDZ7ehIpglPZA0JBcNyRV4BkVxBy/nTodAsGe0GtbNm32H6/6LJTBSxiYkIFtTRJMv6nAkEAhYC8PIbTE6thK7oQAvpQ86ehBvnnaKeQWotIDUM/APHu7A1eD0ycLLj9DHGf4NybMdYIUrWJ64DIM9tq9NrFIQJBAJ3t3bC1B7eFgn7pxIBEdtFYBXwkKR6dMn7lj5b1HGVZzId2X7/CqQSoNawOhaG1otGh2BlRhxum23GQj+o3/o8CQBGiWhMiW6AuxFixs2BoHW3dM5oLHU6cG5BvA7uBqSLJUtLCGK2AiygAqUZEowUylkqJhAuqoZguaEa6ncMf8Ao=
-----END PRIVATE KEY-----
"""
    
    # 要加密的消息
    original_message = """{"Token":"KXNMVRTLPQWSHDYB","User":{"department":"研究部","real_name":"张三","username":"022022","role_list":[{"create_time":"2024-04-10 13:48:47","role_id":2120014,"role_name":"研究部研报"},{"create_time":"2024-04-10 13:48:47","role_id":2120014,"role_name":"资产管理部研报"},{"create_time":"2024-11-05 18:56:39","role_id":2210059,"role_name":"外部券商研报"}]}}"""

    print(f"原始消息: {original_message}")
    
    # 使用公钥加密
    encrypted_message = encrypt_with_public_key(original_message, public_key_str)
    print(f"加密后的消息: {encrypted_message}")
    
    # 使用私钥解密
    decrypted_message = decrypt_with_private_key(encrypted_message, private_key_str)
    print(f"解密后的消息: {decrypted_message}")

if __name__ == "__main__":
    main()
