/**
 * 极简 XML 字段提取。只支持微信消息里出现的两种形态：
 *   <Tag><![CDATA[value]]></Tag>  /  <Tag>value</Tag>
 *
 * 不引入 XML 库是刻意的：微信报文字段固定、结构极浅，引入完整解析器
 * 反而扩大攻击面（XXE 等）。若将来要处理复杂报文，再换解析器。
 */
export function parseXmlField(xml: string, tag: string): string | undefined {
  const pattern = new RegExp(
    `<${tag}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</${tag}>`,
  )
  const match = pattern.exec(xml)
  if (match === null) return undefined
  return match[1] ?? match[2]
}

/** 构造被动回复的文本消息 XML。 */
export function buildTextReplyXml(toUser: string, fromUser: string, content: string): string {
  const createTime = Math.floor(Date.now() / 1000)
  return (
    '<xml>' +
    `<ToUserName><![CDATA[${toUser}]]></ToUserName>` +
    `<FromUserName><![CDATA[${fromUser}]]></FromUserName>` +
    `<CreateTime>${createTime}</CreateTime>` +
    '<MsgType><![CDATA[text]]></MsgType>' +
    `<Content><![CDATA[${content}]]></Content>` +
    '</xml>'
  )
}
