/**
 * content.js
 * 在目标页面中执行的内容脚本，负责自动填充功能的实现
 */

console.log('Content script loaded!');

/**
 * 检查并填充表单字段
 * 根据保存的规则自动填充匹配的输入框
 */
function checkAndFillForms() {
  console.log('checkAndFillForms running...');
  
  chrome.storage.local.get(['autoFillRules'], function(result) {
    const rules = result.autoFillRules || [];
    console.log('Found rules in content script:', JSON.stringify(rules, null, 2));
    
    if (!rules || rules.length === 0) {
      console.log('No rules found');
      return;
    }
    
    const currentUrl = window.location.href;
    console.log('Current URL:', currentUrl);

    rules.forEach(rule => {
      // 验证规则格式
      if (!rule || !rule.urlPattern || !rule.selector || !rule.defaultValue) {
        console.log('Invalid rule format:', rule);
        return;
      }
      
      console.log('Processing rule:', {
        urlPattern: rule.urlPattern,
        selector: rule.selector,
        defaultValue: rule.defaultValue
      });
      
      if (currentUrl.includes(rule.urlPattern)) {
        console.log('URL pattern matched:', rule.urlPattern);
        console.log('Looking for elements with selector:', rule.selector);
        
        const elements = document.querySelectorAll(rule.selector);
        console.log('Found elements:', elements);
        
        elements.forEach(element => {
          console.log('Checking element:', element);
          if (element.value === '') {
            console.log('Element is empty, trying to fill');
            
            // 尝试获取 Vue 实例
            const vueInstance = getVueInstance();
            console.log('Vue instance:', vueInstance);
            
            if (vueInstance) {
              console.log('Found Vue instance, trying to set value through Vue');
              setValueThroughVue(vueInstance, element, rule.defaultValue);
            } else {
              console.log('No Vue instance found, using DOM method');
              setValueThroughDOM(element, rule.defaultValue);
            }
          }
        });
      }
    });
  });
}

/**
 * 获取页面中的 Vue 实例
 * @returns {Object|null} Vue 实例或 null
 */
function getVueInstance() {
  // 方法1: 通过 __vue__ 获取
  if (document.querySelector('#app')?.__vue__) {
    return document.querySelector('#app').__vue__;
  }
  
  // 方法2: 通过全局变量获取
  if (window.__VUE_ROOT__) {
    return window.__VUE_ROOT__;
  }
  
  // 方法3: 遍历寻找带有 data-v- 属性的元素
  const vueElements = document.querySelectorAll('[data-v-]');
  for (const el of vueElements) {
    if (el.__vue__) {
      return el.__vue__.$root;
    }
  }

  return null;
}

/**
 * 通过 Vue 实例设置输入框的值
 * @param {Object} vueInstance - Vue 实例
 * @param {Element} element - DOM 元素
 * @param {string} value - 要设置的值
 */
function setValueThroughVue(vueInstance, element, value) {
  try {
    // 获取输入框的 v-model 绑定
    const elInput = element.closest('.el-input');
    const inputElement = elInput ? elInput.querySelector('input') : element;
    
    // 尝试从 data-v 属性或其他特征找到对应的数据路径
    const vModel = findVModelBinding(inputElement);
    if (vModel) {
      // 使用 Vue 的 $set 方法设置值
      const path = vModel.split('.');
      let current = vueInstance;
      
      // 遍历路径直到倒数第二层
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
        if (!current) break;
      }
      
      // 设置最终值
      if (current) {
        const lastKey = path[path.length - 1];
        vueInstance.$set(current, lastKey, value);
        
        // 强制更新视图
        vueInstance.$nextTick(() => {
          // 确保 DOM 也更新了
          inputElement.value = value;
          inputElement.dispatchEvent(new Event('input', {
            bubbles: true,
            cancelable: false
          }));
        });
      }
    }
  } catch (e) {
    console.log('Vue 设置失败，使用 DOM 方式');
    setValueThroughDOM(element, value);
  }
}

/**
 * 查找元素的 v-model 绑定
 * @param {Element} element - DOM 元素
 * @returns {string|null} v-model 绑定的表达式或 null
 */
function findVModelBinding(element) {
  // 1. 检查 v-model 属性
  const vModelAttr = Array.from(element.attributes).find(attr => 
    attr.name === 'v-model' || 
    attr.name.startsWith('v-model.') || 
    attr.name === ':model'
  );
  
  if (vModelAttr) return vModelAttr.value;
  
  // 2. 检查 Vue 开发者工具注入的属性
  const vueBinding = element.__vueBinding;
  if (vueBinding && vueBinding.model) {
    return vueBinding.model.expression;
  }
  
  // 3. 尝试从组件实例获取
  const vm = element.__vue__;
  if (vm && vm.$options.model) {
    return vm.$options.model.expression;
  }
  
  return null;
}

/**
 * 通过 DOM 方式设置值（降级方案）
 * @param {Element} element - DOM 元素
 * @param {string} value - 要设置的值
 */
function setValueThroughDOM(element, value) {
  const elInput = element.closest('.el-input');
  if (elInput) {
    const inputElement = elInput.querySelector('input') || element;
    inputElement.value = value;
    inputElement.dispatchEvent(new Event('input', {
      bubbles: true,
      cancelable: false
    }));
  } else {
    element.value = value;
    element.dispatchEvent(new Event('input', {
      bubbles: true,
      cancelable: false
    }));
  }
}

/**
 * 创建防抖函数
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖处理后的函数
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 创建防抖版本的检查函数
const debouncedCheck = debounce(checkAndFillForms, 500);

// 确保脚本执行
console.log('Setting up event listeners...');

// 使用多种方式来确保脚本执行
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded fired');
  setTimeout(() => {
    console.log('Initial timeout running');
    checkAndFillForms();
  }, 1000);
});

// 也在页面加载完成后执行
window.addEventListener('load', () => {
  console.log('Window load fired');
  setTimeout(() => {
    console.log('Load timeout running');
    checkAndFillForms();
  }, 1500);
});

// 立即执行一次
setTimeout(() => {
  console.log('Immediate timeout running');
  checkAndFillForms();
}, 0);

// MutationObserver 设置
const observer = new MutationObserver((mutations) => {
  console.log('DOM mutation detected');
  // 检查是否有新的输入框被添加
  const hasNewInputs = mutations.some(mutation => 
    Array.from(mutation.addedNodes).some(node => 
      node.querySelectorAll && (
        node.querySelectorAll('input').length > 0 ||
        node.querySelectorAll('.el-input').length > 0
      )
    )
  );
  
  if (hasNewInputs) {
    console.log('New inputs detected, running check');
    debouncedCheck();
  }
});

// 开始观察 DOM 变化
console.log('Starting MutationObserver');
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true
});

// 监听路由变化
window.addEventListener('popstate', checkAndFillForms);
window.addEventListener('hashchange', checkAndFillForms); 