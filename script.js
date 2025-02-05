let chatBox; // Declare chatBox at a higher scope but don't initialize it yet

let conversationHistory = [];

let initialPromt = 'Your are DND Dungeon Master! At the start, prompt the user what language they would like the game to use and wait for their answer. Then, ask their character\s name, so that you may use it for the rest of the conversation, again waiting for their answer. Then, generate a random fantasy scenario and present it to them, await further prompts and never lose character as a dungeon master. End sentences with a question, prompting the user what they would do.'

document.addEventListener('DOMContentLoaded', () => {
    chatBox = document.getElementById('chat-box'); // Initialize chatBox once the DOM is fully loaded
    const sendButton = document.getElementById('send-button');
    const userInput = document.getElementById('user-input');

    fetchResponse(initialPromt);

    sendButton.addEventListener('click', () => {
        const userText = userInput.value.trim();
        if (userText) {
            displayMessage(userText, 'user-message', true);
            fetchResponse(userText);
            userInput.value = ''; // Clear input field
        }
    });
});

function displayMessage(message, className, isUser = false) {
    const messageDiv = document.createElement('div');
    // Create a bold & underlined prefix for Dungeon Master
    if (!isUser) {
        const botLabel = document.createElement('strong');
        botLabel.innerHTML = "<u>Dungeon Master:</u> ";
        messageDiv.appendChild(botLabel);
    } else {
        message = `You: ${message}`; // Add "You:" for user messages
    }

    messageDiv.innerHTML += message; // Append the actual message text
    messageDiv.className = className;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function fetchResponse(userInput) {
    const openAIKey = config.OPEN_AI_API_KEY;
    const sendButton = document.getElementById('send-button');

    // Disable the send button while processing
    sendButton.disabled = true;
    sendButton.textContent = "Thinking..."; 

    // Add user's message to chat
    conversationHistory.push({ role: "user", content: userInput });

    // Create a loader message
    const loader = document.createElement('div');
    loader.className = 'bot-message loader';
    loader.textContent = "...";
    chatBox.appendChild(loader);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openAIKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: conversationHistory,
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
        const botMessage = data.choices[0].message.content.trim();

        // Add AI response to history
        conversationHistory.push({ role: "assistant", content: botMessage });

        // Replace loader with actual bot message
        loader.textContent = "Dungeon Master: " + botMessage;
        loader.classList.remove('loader');

    } catch (error) {
        console.error('Error fetching response:', error);
        loader.textContent = "Sorry, there was an error processing your request.";
        loader.classList.remove('loader');
    } finally {
        // Re-enable send button
        sendButton.disabled = false;
        sendButton.textContent = "Send";
    }
}