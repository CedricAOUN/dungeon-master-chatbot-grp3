let chatBox;
let conversationHistory = [];
let userMessageCount = 3;
let targetMessageCount = getRandomTargetMessageCount();
let monsterHp = 0;
let monsterContainerElement, monsterHpElement, monsterImgElement;

document.addEventListener('DOMContentLoaded', initialize);

function initialize() {
    chatBox = document.getElementById('chat-box');
    monsterContainerElement = document.getElementById('monster-container');
    monsterHpElement = document.getElementById('monster-hp');
    monsterImgElement = document.getElementById('monster-img');

    setupEventListeners();
    fetchResponse(initialPrompt);
}

function setupEventListeners() {
    document.getElementById('send-button').addEventListener('click', sendMessage);
    document.getElementById('user-input').addEventListener('keydown', handleEnterKey);
    document.getElementById('start-button').addEventListener('click', startGame);
}

function handleEnterKey(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function startGame() {
    const langSelect = document.getElementById('lang-select');
    displayMessage(langSelect.value, 'user-message', true);
    fetchResponse(langSelect.value);

    ['lang-select', 'start-button'].forEach(id => document.getElementById(id).style.display = 'none');
    ['user-input', 'send-button'].forEach(id => document.getElementById(id).style.display = 'block');
}

function sendMessage() {
    const userInput = document.getElementById('user-input');
    const userText = userInput.value.trim();
    if (!userText) return;

    displayMessage(userText, 'user-message', true);
    fetchResponse(userText);
    userInput.value = '';
    userMessageCount++;
}

async function fetchResponse(userInput) {
    const sendButton = document.getElementById('send-button');
    const startTime = new Date();
    let botStatus = {};  // Ensure it's always an object to prevent errors
    let response;  // Declare response outside try
    toggleSendButton(sendButton, true);

    conversationHistory.push({ role: "user", content: userInput });
    const loader = showLoader();
    
    try {
        let scenario = await checkForMonsterEncounter();
        response = await getOpenAIResponse(scenario);
        botStatus = handleBotResponse(response, loader) || {}; // Ensure it always returns an object
    } catch (error) {
        console.error('Error fetching response:', error);
        loader.textContent = "Error processing request.";
    } finally {
        toggleSendButton(sendButton, false);
        console.log(response); // Debugging to check response status

        const timeElapsed = ((new Date() - startTime) / 1000).toFixed(2) + 's';

        // Only log if response exists and webhook URL is set
        if (config.webhookURL && conversationHistory.length > 4 && response) {
            logToGoogleSheets(
                new Date(),
                response.status || 200, // Avoid errors if response lacks status
                userInput,
                botStatus.msg || response.error || "No message available",
                timeElapsed,
                botStatus.tokens || 0
            );
        }
    }
}

async function checkForMonsterEncounter() {
    if (userMessageCount >= targetMessageCount && monsterHp === 0) {
        const monster = await getRandomMonster();
        if (monster) return handleMonsterEncounter(monster);
    }
    return "What will you do next?";
}

async function getOpenAIResponse(scenario) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.OPEN_AI_API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-4o",
            messages: [...conversationHistory, { role: "system", content: scenario }],
            temperature: 0.7,
            max_tokens: 150
        }),
    });

    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return response.json();
}

function handleBotResponse(data, loader) {
    const botMessage = data.choices[0].message.content.trim();
    conversationHistory.push({ role: "assistant", content: botMessage });

    loader.textContent = `Dungeon Master: ${botMessage}`;
    loader.classList.remove('loader');
    monsterHandler(botMessage);
    chatBox.lastElementChild.scrollIntoView({ behavior: "smooth" });

    return { tokens: data.usage.total_tokens, msg: botMessage } ;
}

async function handleMonsterEncounter(monster) {
    const monsterNameElement = document.getElementById('monster-name');
    const scenario = `A wild ${monster.name} with ${monster.hit_points} HP appears! What do you do?`;
    monsterContainerElement.style.display = 'block';
    document.getElementById('monster-name').style.display='none';
    const monsterImageUrl = await generateMonsterImage(monster);
    if (monsterImageUrl) {
        document.getElementById('monster-name').style.display='block';
        monsterImgElement.src = monsterImageUrl;
        monsterImgElement.style.display = 'block';
        monsterNameElement.innerText = monster.name;
        monsterHp = monster.hit_points;
        monsterHpElement.innerText = monsterHp;
    }

    userMessageCount = 0;
    targetMessageCount = getRandomTargetMessageCount();
    return scenario;
}

async function generateMonsterImage(monster) {
    try {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.OPEN_AI_API_KEY}`
            },
            body: JSON.stringify({ prompt: `An image of ${monster.name}, a ${monster.size} ${monster.type} monster.` })
        });

        if (!response.ok) throw new Error(`Error generating image: ${response.status}`);
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
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();
        const randomMonster = data.results[Math.floor(Math.random() * data.results.length)];
        return (await fetch(`https://www.dnd5eapi.co/api/monsters/${randomMonster.index}`)).json();
    } catch (error) {
        console.error('Error fetching monster:', error);
        return null;
    }
}

function displayMessage(message, className, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = className;
    messageDiv.innerHTML = isUser ? `You: ${message}` : `<strong>Dungeon Master:</strong> ${message}`;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function showLoader() {
    const loader = document.createElement('div');
    loader.className = 'bot-message loader';
    loader.textContent = "...";
    chatBox.appendChild(loader);
    return loader;
}

function toggleSendButton(button, isDisabled) {
    button.disabled = isDisabled;
    button.textContent = isDisabled ? "Thinking..." : "Send";
}

function getRandomTargetMessageCount() {
    return Math.floor(Math.random() * 6) + 5;
}

function monsterHandler(msg) {
    if (msg.includes('[BATTLE_END]')) {
        monsterHp = 0;
        monsterContainerElement.style.display = 'none';
        monsterHpElement.innerText = '';
        monsterImgElement.src = '';
    } else {
        const dmgMatch = msg.match(/\[DMG\]:\s*(\d+)/);
        if (dmgMatch) monsterHp -= parseInt(dmgMatch[1], 10);
        monsterHpElement.innerText = monsterHp;
    }
}

function logToGoogleSheets(date, status, prompt, aiResponse, responseTime, tokens) {
    const url = new URL(config.webhookURL);
    
    url.searchParams.append("Date", date);
    url.searchParams.append("Prompt", prompt);
    url.searchParams.append("AI-response", aiResponse);
    url.searchParams.append("Status", status);
    url.searchParams.append("Response-time", responseTime);
    url.searchParams.append("tokens-used", tokens);
    fetch(url, { method: "GET" })
    .catch(err => console.log("Error logging to Google Sheets:", err));
}