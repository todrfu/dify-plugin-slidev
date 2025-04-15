import { parseMarkdownString } from '../../src/utils/parse-markdown-string'

describe('parseMarkdownString', () => {
  // 测试不同类型的输入
  const testCases = [
    // 标准JSON字符串形式
    {
      name: '标准JSON字符串形式',
      input: '"--- \\nlayout: cover\\n---\\n\\n# 封面\\n\\n这是封面布局"',
      expected: '--- \nlayout: cover\n---\n\n# 封面\n\n这是封面布局',
    },
    // 包含代码块的复杂内容
    {
      name: '包含代码块的复杂内容',
      input:
        '"--- \\nlayout: cover\\n---\\n\\n# 封面\\n\\n这是封面布局\\n\\n```python\\nclass Dog:\\n\\n  def __init__(self, name):\\n    self.name = name\\n\\n  def speak(self):\\n    print(f\\"狗的名字是: {self.name}\\")\\n```\\n"',
      expected:
        '--- \nlayout: cover\n---\n\n# 封面\n\n这是封面布局\n\n```python\nclass Dog:\n\n  def __init__(self, name):\n    self.name = name\n\n  def speak(self):\n    print(f"狗的名字是: {self.name}")\n```\n',
    },
    // 带单引号的情况
    {
      name: '带单引号的情况',
      input: "'--- \\nlayout: cover\\n---\\n\\n# 封面'",
      expected: '--- \nlayout: cover\n---\n\n# 封面',
    },
    // 没有引号包裹，直接替换
    {
      name: '没有引号包裹，直接替换',
      input: '--- \\nlayout: cover\\n---\\n\\n# 封面',
      expected: '--- \nlayout: cover\n---\n\n# 封面',
    },
    // 普通文本，没有转义字符
    {
      name: '普通文本，没有转义字符',
      input: '# 普通文本\n没有转义字符',
      expected: '# 普通文本\n没有转义字符',
    },
  ]

  testCases.forEach((testCase) => {
    it(`应该正确解析${testCase.name}`, () => {
      const result = parseMarkdownString(testCase.input)
      expect(result).toBe(testCase.expected)
    })
  })

  it('应该处理JSON解析失败的情况', () => {
    // 测试双引号包裹但不是有效JSON的情况
    const invalidJson = '"这是无效的JSON"字符串'
    const result = parseMarkdownString(invalidJson)

    // 由于无法解析为有效JSON，预期结果应该依次尝试后续的处理方法
    // 具体行为取决于parseMarkdownString的实现逻辑
    const processed = invalidJson
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, '\\')

    expect(result).toBe(processed)
  })

  it('应该处理单引号内的转义字符', () => {
    const input = "'转义的\\t制表符\\n和换行'"
    const expected = '转义的\t制表符\n和换行'
    const result = parseMarkdownString(input)
    expect(result).toBe(expected)
  })
})
