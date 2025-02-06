let chatBox; // Declare chatBox at a higher scope but don't initialize it yet

let conversationHistory = [];

let initialPromt = 'Your are DND Dungeon Master! At the start, prompt the user what language they would like the game to use and wait for their answer. Then, ask their character\s name, so that you may use it for the rest of the conversation, again waiting for their answer. Then, generate a random fantasy scenario and present it to them, await further prompts and never lose character as a dungeon master. End sentences with a question, prompting the user what they would do.'

let userMessageCount = 3;

let targetMessageCount = Math.floor(Math.random() * 6) + 5; // Random number between 5 and 10

document.addEventListener('DOMContentLoaded', () => {
    chatBox = document.getElementById('chat-box');
    const sendButton = document.getElementById('send-button');
    const userInput = document.getElementById('user-input');

    fetchResponse(initialPromt);

    sendButton.addEventListener('click', () => {
        const userText = userInput.value.trim();
        if (userText) {
            displayMessage(userText, 'user-message', true);
            fetchResponse(userText);
            userInput.value = ''; // Clear input field
            userMessageCount++; // Increase the counter with each user message
        }
    });
});

async function fetchResponse(userInput) {
    const openAIKey = config.OPEN_AI_API_KEY;
    const sendButton = document.getElementById('send-button');

    sendButton.disabled = true;
    sendButton.textContent = "Thinking...";

    conversationHistory.push({ role: "user", content: userInput });

    const loader = document.createElement('div');
    loader.className = 'bot-message loader';
    loader.textContent = "...";
    chatBox.appendChild(loader);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        let scenario = "What will you do next?";
        if (userMessageCount >= targetMessageCount) { // Check against the target message count
            const monster = await getRandomMonster();
            if (monster) {
                scenario = `A wild ${monster.name} appears! What do you do?`;
                // Reset the counter and target for the next monster encounter
                userMessageCount = 0;
                targetMessageCount = Math.floor(Math.random() * 6) + 5; // New random number between 5 and 10
            }
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openAIKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [...conversationHistory, { role: "system", content: scenario }],
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

        conversationHistory.push({ role: "assistant", content: botMessage });

        loader.textContent = "Dungeon Master: " + botMessage;
        loader.classList.remove('loader');
    } catch (error) {
        console.error('Error fetching response:', error);
        loader.textContent = "Sorry, there was an error processing your request.";
        loader.classList.remove('loader');
    } finally {
        sendButton.disabled = false;
        sendButton.textContent = "Send";
    }
}


async function getRandomMonster() {
    try {
        const response = await fetch('https://www.dnd5eapi.co/api/monsters');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const monsters = data.results;
        const randomIndex = Math.floor(Math.random() * monsters.length);
        const monster = monsters[randomIndex];

        const monsterDetailsResponse = await fetch(`https://www.dnd5eapi.co/api/monsters/${monster.index}`);
        if (!monsterDetailsResponse.ok) {
            throw new Error(`HTTP error! status: ${monsterDetailsResponse.status}`);
        }
        const monsterDetails = await monsterDetailsResponse.json();

        return monsterDetails;
    } catch (error) {
        console.error('Error fetching monster:', error);
        return null; // Or handle more gracefully
    }
}

function displayMessage(message, className, isUser = false) {
    const messageDiv = document.createElement('div');
    if (!isUser) {
        const botLabel = document.createElement('strong');
        botLabel.innerHTML = "<u>Dungeon Master:</u> ";
        messageDiv.appendChild(botLabel);
    } else {
        message = `You: ${message}`;
    }

    messageDiv.innerHTML += message;
    messageDiv.className = className;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}