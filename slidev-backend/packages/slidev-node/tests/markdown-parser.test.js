/**
 * Markdown解析器测试
 */

function parseMarkdownString(markdownString) {
  // 如果输入是JSON字符串格式（带双引号），先尝试使用JSON.parse解析
  if (markdownString.startsWith('"') && markdownString.endsWith('"')) {
    try {
      return JSON.parse(`{"content":${markdownString}}`).content;
    } catch (e) {
      console.log('JSON解析失败，将直接处理转义字符');
    }
  }

  // 如果是单引号包裹的字符串，先移除单引号然后处理转义字符
  if (markdownString.startsWith("'") && markdownString.endsWith("'")) {
    markdownString = markdownString.substring(1, markdownString.length - 1);
  }

  // 直接替换常见的转义字符
  return markdownString
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');
}

// 测试不同类型的输入
const testCases = [
  // 标准JSON字符串形式
  {
    input: '"--- \\nlayout: cover\\n---\\n\\n# 封面\\n\\n这是封面布局"',
    expected: '--- \nlayout: cover\n---\n\n# 封面\n\n这是封面布局'
  },
  // 包含代码块的复杂内容
  {
    input: '"--- \\nlayout: cover\\n---\\n\\n# 封面\\n\\n这是封面布局\\n\\n```python\\nclass Dog:\\n\\n  def __init__(self, name):\\n    self.name = name\\n\\n  def speak(self):\\n    print(f\\"狗的名字是: {self.name}\\")\\n```\\n"',
    expected: '--- \nlayout: cover\n---\n\n# 封面\n\n这是封面布局\n\n```python\nclass Dog:\n\n  def __init__(self, name):\n    self.name = name\n\n  def speak(self):\n    print(f"狗的名字是: {self.name}")\n```\n'
  },
  // 带单引号的情况
  {
    input: '\'--- \\nlayout: cover\\n---\\n\\n# 封面\'',
    expected: '--- \nlayout: cover\n---\n\n# 封面'
  },
  // 没有引号包裹，直接替换
  {
    input: '--- \\nlayout: cover\\n---\\n\\n# 封面',
    expected: '--- \nlayout: cover\n---\n\n# 封面'
  },
  // 普通文本，没有转义字符
  {
    input: '# 普通文本\n没有转义字符',
    expected: '# 普通文本\n没有转义字符'
  }
];

// 运行测试
console.log('开始测试Markdown解析器');
console.log('======================');

testCases.forEach((testCase, index) => {
  const result = parseMarkdownString(testCase.input);
  const success = result === testCase.expected;

  console.log(`测试用例 #${index + 1}:`);
  console.log(`输入: ${JSON.stringify(testCase.input).substring(0, 50)}...`);
  console.log(`期望输出: ${JSON.stringify(testCase.expected).substring(0, 50)}...`);
  console.log(`实际输出: ${JSON.stringify(result).substring(0, 50)}...`);
  console.log(`测试结果: ${success ? '✅ 通过' : '❌ 失败'}`);

  if (!success) {
    console.log('差异:');
    for (let i = 0; i < Math.max(result.length, testCase.expected.length); i++) {
      if (result[i] !== testCase.expected[i]) {
        console.log(`位置 ${i}: 期望 "${testCase.expected[i] || ''}" (${testCase.expected.charCodeAt(i) || 'None'}), 实际 "${result[i] || ''}" (${result.charCodeAt(i) || 'None'})`);
      }
    }
  }

  console.log('----------------------');
});

console.log('测试完成');
