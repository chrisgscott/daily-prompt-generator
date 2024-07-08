function generateEmailContent(prompt) {
    return `
      <html>
        <body>
          <h1>Your Daily Journal Prompt</h1>
          <p>${prompt}</p>
          <p>Happy journaling!</p>
        </body>
      </html>
    `;
  }
  
  module.exports = generateEmailContent;