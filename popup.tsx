const BADGE_STYLE: React.CSSProperties = {
  borderRadius: 3,
  padding: "0 5px",
  fontSize: 11,
  color: "#fff"
}

function Badge({ bg, label }: { bg: string; label: string }) {
  return <span style={{ ...BADGE_STYLE, background: bg }}>{label}</span>
}

function IndexPopup() {
  return (
    <div style={{ padding: 16, width: 260, fontFamily: "sans-serif" }}>
      <h2 style={{ fontSize: 15, marginBottom: 8 }}>
        笔记限流检测器 （仅供参考）
      </h2>
      <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6, margin: 0 }}>
        请打开 创作者后台笔记管理页面 ，扩展会自动在每条笔记上显示推荐级别标签：
      </p>

      <p style={{ fontSize: 12, color: "#888", margin: "10px 0 4px" }}>
        正常（绿色渐强）
      </p>
      <ul
        style={{
          fontSize: 12,
          lineHeight: 2,
          margin: 0,
          paddingLeft: 16,
          color: "#333"
        }}>
        <li>
          <Badge bg="#52c41a" label="L2 正常" /> 正常展示
        </li>
      </ul>

      <p style={{ fontSize: 12, color: "#888", margin: "10px 0 4px" }}>
        限流（红色渐强）
      </p>
      <ul
        style={{
          fontSize: 12,
          lineHeight: 2,
          margin: 0,
          paddingLeft: 16,
          color: "#333"
        }}>
        <li>
          <Badge bg="#f5222d" label="L-1 限流" /> 限流
        </li>
      </ul>
    </div>
  )
}

export default IndexPopup
