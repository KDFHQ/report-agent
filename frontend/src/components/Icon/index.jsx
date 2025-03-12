import st from './index.module.css'

export default function Icon({ className, name }) {
    return <svg className={`${st['icon']} ${className}`} aria-hidden="true">
        <use xlinkHref={`#${name}`}></use>
    </svg>
}
