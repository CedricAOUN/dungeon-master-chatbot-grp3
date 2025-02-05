let chatBox; // Declare chatBox at a higher scope but don't initialize it yet

document.addEventListener('DOMContentLoaded', () => {
    chatBox = document.getElementById('chat-box'); // Initialize chatBox once the DOM is fully loaded
    const sendButton = document.getElementById('send-button');
    const userInput = document.getElementById('user-input');

    sendButton.addEventListener('click', () => {
        const userText = userInput.value.trim();
        if (userText) {
            displayMessage(userText, 'user-message');
            fetchResponse(userText);
            userInput.value = ''; // Clear input field
        }
    });
});

function displayMessage(message, className) {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.className = className;
    chatBox.appendChild(messageDiv); // Now chatBox is accessible
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to the newest message
}

async function fetchResponse(userInput) {
    const openAIKey = config.OPEN_AI_API_KEY; // Directly use the API key for testing, but remember to replace this with a secure method for production
    try {
        const response = await fetch('https://api.openai.com/v1/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openAIKey}`
            },
            body: JSON.stringify({
                model: "text-davinci-003",
                prompt: userInput,
                temperature: 0.7,
                max_tokens: 150,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        displayMessage(data.choices[0].text.trim(), 'bot-message');
    } catch (error) {
        console.error('Error fetching response:', error);
        displayMessage('Sorry, there was an error processing your request.', 'bot-message');
    }
}