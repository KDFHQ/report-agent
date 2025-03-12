// userStore.js
import { makeObservable, action, observable, runInAction, override, computed } from 'mobx';
import axios from 'axios';
import api from '@/worker/api'

// 为什么需要 runInAction：
// - MobX 严格模式要求所有状态修改必须在 action 中进行
// - 异步操作的回调中直接修改状态会违反这个规则
// - runInAction 提供了一个临时的 action 作用域

const USER_INFO = 'user_info'
const USER_TOKEN = 'user_token'

// axios 实例配置
const request = axios.create({
  baseURL: api.BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
request.interceptors.request.use(
  config => {
    const token = localStorage.getItem(USER_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    return Promise.reject(error);
  }
);

class User {
  @observable accessor user_info = null;
  @observable accessor token = null;
  @observable accessor loading = false;
  @observable accessor error = null;

  constructor() {
    this.init()
    makeObservable(this);
    this.post = request.post
    this.get = request.get
    this.put = request.put
    this.delete = request.delete
  }

  @action
  async init() {
    try {
      const token = localStorage.getItem(USER_TOKEN)
      if (token) {
        this.token = token
      }
    } catch (err) {
      console.warn("自动登录失败", err)
      return
    }
    try {
      // 暂时先不考虑本地缓存信息的有效性
      const user_info = localStorage.getItem(USER_INFO)
      if (user_info) {
        this.user_info = JSON.parse(user_info)
      }
    } catch (err) {
      console.warn("获取缓存用户信息失败", err)
    }
  }

  @computed
  get is_login() {
    return !!this.token
  }

  // 登录
  @action
  async login(username, password) {
    try {
      const response = await this.post(api.user_login, {
        username,
        password
      });
      
      runInAction(() => {
        this.user_info = response.data;
        this.token = this.user_info.access_token
        localStorage.setItem(USER_TOKEN, this.user_info.access_token);
        localStorage.setItem(USER_INFO, JSON.stringify(response.data));
      });
      
      return response;
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
        this.loading = false;
      });
      throw error;
    }
  }

  @action
  async talkLLM(data, func = () => {}) {
    // 设置默认headers
    const headers = {
      'Authorization': `Bearer ${this.token}`
    };

    const response = await fetch(api.BASE_URL + api.report_chat_stream, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...data
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 获取 ReadableStream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    // 读取流数据
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }
      
      // 解码并处理每个数据块
      const chunk = decoder.decode(value);
      
      // 处理返回的数据
      // 这里可以根据实际需求处理数据，比如显示在页面上
      func(chunk);
    }
  }

  // 获取用户信息
  @action
  async getUserInfo() {
    this.loading = true;
    this.error = null;

    try {
      const response = await request.get('/user/info');
      
      runInAction(() => {
        this.user_info = response.data;
        this.loading = false;
      });
      
      return response;
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
        this.loading = false;
      });
      throw error;
    }
  }

  // 更新用户信息
  @action
  async updateUserInfo(userData) {
    this.loading = true;
    this.error = null;

    try {
      const response = await request.put('/user/info', userData);
      
      runInAction(() => {
        this.user_info = response.data;
        this.loading = false;
      });
      
      return response;
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
        this.loading = false;
      });
      throw error;
    }
  }

  // 退出登录
  @action
  logout() {
    this.user_info = null;
    localStorage.removeItem('token');
  }
}

export default new User();
