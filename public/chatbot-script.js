(function() {
  var script = document.createElement('script');
  script.src = 'https://your-nextjs-app-url.com/_next/static/chunks/pages/index.js';
  script.onload = function() {
    var chatbotContainer = document.createElement('div');
    chatbotContainer.id = 'chatbot-container';
    document.body.appendChild(chatbotContainer);
    
    // Assuming your Chatbot component is exported as a named export
    var Chatbot = window.NextComponents.Chatbot;
    ReactDOM.render(React.createElement(Chatbot), chatbotContainer);
  };
  document.head.appendChild(script);
})();