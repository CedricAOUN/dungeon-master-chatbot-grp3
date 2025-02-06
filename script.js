let chatBox; // Declare chatBox at a higher scope but don't initialize it yet

let conversationHistory = [];

let userMessageCount = 3;

let targetMessageCount = Math.floor(Math.random() * 6) + 5; // Random number between 5 and 10

document.addEventListener('DOMContentLoaded', () => {
    chatBox = document.getElementById('chat-box');
    const sendButton = document.getElementById('send-button');
    const userInput = document.getElementById('user-input');
    const langSelect = document.getElementById('lang-select');
    const startButton = document.getElementById('start-button');

    fetchResponse(initialPrompt); // Replace 'initialPrompt' with your actual initial prompt

    sendButton.addEventListener('click', () => {
        sendMessage();
    });

    userInput.addEventListener('keydown', (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault(); // Prevent the default action to avoid form submission or newline
            sendMessage();
        }
    });

    startButton.addEventListener('click', () => {
        displayMessage(langSelect.value, 'user-message', true);
        fetchResponse(langSelect.value);
        userInput.value = '';
        langSelect.style.display = 'none';
        startButton.style.display = 'none';
        userInput.style.display = 'block';
        sendButton.style.display = 'block';
    })


    function sendMessage() {
        const userText = userInput.value.trim();
        if (userText) {
            displayMessage(userText, 'user-message', true);
            fetchResponse(userText);
            userInput.value = ''; // Clear input field after sending
            userMessageCount++; // Increase the user message count
        }
    }
});

async function fetchResponse(userInput) {
    const openAIKey = config.OPEN_AI_API_KEY; // Make sure to use your actual API key
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
            const monsterImgElement = document.getElementById('monster-img');
            const monsterNameElement = document.getElementById('monster-name');
            const monsterContainerElement = document.getElementById('monster-container');

            if (monster) {
                console.log(monster);
                scenario = `A wild ${monster.name} appears! What do you do?`;
                monsterContainerElement.style.display = 'block';

                // Create a loader inside the monster container
                const monsterLoader = document.createElement('div');
                monsterLoader.className = 'monster-loader';
                monsterLoader.textContent = 'You sense something approaching...';
                monsterContainerElement.appendChild(monsterLoader);

                // Fetch the image of the monster using a DALL-E or similar API
                const monsterDescription = `${monster.name}, ${monster.size} ${monster.type} monster with ${monster.appearance || "an intimidating presence"}`;
                const monsterImageUrl = await generateMonsterImage(monsterDescription);
                
                if (monsterImageUrl) {
                    // Display the generated monster image
                    monsterImgElement.src = monsterImageUrl;
                    monsterImgElement.style.display = 'block';
                    monsterNameElement.innerHTML = monster.name;

                    // Remove the loader once the image is ready
                    monsterLoader.remove();
                }

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

async function generateMonsterImage(monsterDescription) {
    try {
        const dalleApiKey = config.OPEN_AI_API_KEY; // DALL-E API key (replace with your own)
        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${dalleApiKey}`
            },
            body: JSON.stringify({
                prompt: `An image of a ${monsterDescription}`,
                n: 1,
                size: '256x256'
            })
        });

        if (!response.ok) {
            throw new Error(`Error generating image: ${response.status}`);
        }

        const data = await response.json();
        return data.data[0].url;
    } catch (error) {
        console.error('Error generating monster image:', error);
        return null;
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
