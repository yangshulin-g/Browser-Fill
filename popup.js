/**
 * popup.js
 * 处理扩展弹出窗口的交互逻辑
 */

// 在文件开头添加清除函数
function clearAllRules(callback) {
  chrome.storage.local.set({ autoFillRules: [] }, function() {
    console.log('All rules cleared');
    if (callback) callback();
  });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  // 加载并显示已保存的规则
  loadRules();

  // 监听保存按钮的点击事件
  document.getElementById('saveRule').addEventListener('click', function() {
    // 获取表单中的值
    const urlPattern = document.getElementById('urlPattern').value;
    const selector = document.getElementById('selector').value;
    const defaultValue = document.getElementById('defaultValue').value;

    // 验证表单数据
    if (!urlPattern || !selector || !defaultValue) {
      alert('请填写所有字段！');
      return;
    }

    // 获取已存在的规则并添加新规则
    chrome.storage.local.get(['autoFillRules'], function(result) {
      const rules = result.autoFillRules || [];
      // 创建新规则对象
      const newRule = {
        urlPattern: urlPattern,    // 网站 URL 匹配模式
        selector: selector,        // CSS 选择器
        defaultValue: defaultValue // 默认填充值
      };
      
      // 添加新规则到规则列表
      rules.push(newRule);
      
      // 保存更新后的规则列表
      chrome.storage.local.set({ autoFillRules: rules }, function() {
        loadRules();  // 重新加载规则列表
        clearForm();  // 清空表单
      });
    });
  });
});

/**
 * 加载并显示已保存的规则列表
 */
function loadRules() {
  const rulesList = document.getElementById('rulesList');
  rulesList.innerHTML = '<h3>已保存的规则：</h3>';

  // 从存储中获取规则列表
  chrome.storage.local.get(['autoFillRules'], function(result) {
    const rules = result.autoFillRules || [];
    // 遍历规则列表，为每个规则创建显示元素
    rules.forEach((rule, index) => {
      const ruleElement = document.createElement('div');
      // 创建规则显示的 HTML
      ruleElement.className = 'rule-item';
      ruleElement.innerHTML = `
        <p>
          <strong>网站：</strong>
          <span class="field-value">${rule.urlPattern}</span>
        </p>
        <p>
          <strong>选择器：</strong>
          <span class="field-value">${rule.selector}</span>
        </p>
        <p>
          <strong>默认值：</strong>
          <span class="field-value">${rule.defaultValue}</span>
        </p>
        <button class="delete-rule" data-index="${index}">删除规则</button>
      `;
      rulesList.appendChild(ruleElement);
    });

    // 为每个删除按钮添加点击事件监听器
    document.querySelectorAll('.delete-rule').forEach(button => {
      button.addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'));
        deleteRule(index);
      });
    });
  });
}

/**
 * 删除指定索引的规则
 * @param {number} index - 要删除的规则索引
 */
function deleteRule(index) {
  chrome.storage.local.get(['autoFillRules'], function(result) {
    const rules = result.autoFillRules || [];
    // 从数组中移除指定索引的规则
    rules.splice(index, 1);
    // 保存更新后的规则列表
    chrome.storage.local.set({ autoFillRules: rules }, function() {
      loadRules(); // 重新加载规则列表
    });
  });
}

/**
 * 清空表单中的所有输入字段
 */
function clearForm() {
  document.getElementById('urlPattern').value = '';
  document.getElementById('selector').value = '';
  document.getElementById('defaultValue').value = '';
} 