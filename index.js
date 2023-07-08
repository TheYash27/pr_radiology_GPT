import { initializeApp } from 'firebase/app'
import { getDatabase, ref, push } from 'firebase/database'

import { Configuration, OpenAIApi } from 'openai'

const configuration = new Configuration({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
})

const openai = new OpenAIApi(configuration)

const appSettings = {
    databaseURL: 'https://gpt-4-chatbot-default-rtdb.asia-southeast1.firebasedatabase.app/'
}

const app = new initializeApp(appSettings)

const database = getDatabase(app)

const conversationInDb = ref(database)

const chatbotConversation = document.getElementById('chatbot-conversation')
const responseContainer = document.getElementById('response-container')
const userInput = document.getElementById('user-input')

userInput.addEventListener("focus", function() {
    userInput.setAttribute("rows", 6)
})
  
userInput.addEventListener("blur", function() {
    userInput.removeAttribute("rows")
})

const conversationArr = []

let AIResponse = ''
const editableSpeechBubble = document.createElement('div')
editableSpeechBubble.classList.add('speech', 'speech-human')
editableSpeechBubble.setAttribute("contenteditable", true)

  
const instructionObj = {
    role: 'system',
    content: `
    You are a very experienced radiologist with
    specialization in knee MRI scans.
    You will be provided with a short summary of a knee MRI report.
    You have to create a detailed report from the same
    while strictly following the report template provided, delimited with
    "####" characters.
    Make sure to retain the chronological order of the paragraphs specific to different parts of the knee, delimited with "###" characters, in the "Findings" section.
    Make the phrases "MRI of the [side] knee", "Clinical History", "Technique", "Findings", and "Impression", bold in your detailed report.
    Do not make any suggestions in the "Findings" section.
    Do not include in your detailed report whatever knee structures
    have not been explicitly mentioned in the short summary.
    Make sure to include, only in the "Impression" section of your detailed report, any negative comments or points of concern which have been mentioned
    or referred to in the short summary.
    ####
    MRI of the [side] knee\n
    
    Clinical History:
    
    \nTechnique: Multiplanar, multiecho MRI of the [side] knee\n
    
    Findings:
    ###
    There is no medial compartment bone marrow edema. Intact medial articular cartilage, meniscus and collateral ligament.
    ###
    ###
    No lateral compartment bone marrow edema. Intact articular cartilage, lateral meniscus, iliotibial band, biceps femoris, fibular collateral ligament and popliteus.
    ###
    ###
    The extensor mechanism is intact. Patellar position is normal. Patellofemoral cartilage and ligaments are intact.
    ###
    ###
    There is no joint effusion or abnormal bursal fluid.
    ###
    ###
    The anterior, posterior cruciate ligaments and neurovascular structures are intact.
    ###

    \nImpression: Unremarkable MRI of the [side] knee
    ####
    `
}

localStorage.setItem("instructionObj", instructionObj)

document.addEventListener('submit', async (e) => {
    e.preventDefault()
    localStorage.setItem("userInput", {
        role: 'user',
        content: userInput.value
    })
    push(conversationInDb, {
        role: 'user',
        content: userInput.value
    })
    await fetchReply()
    const newSpeechBubble = document.createElement('div')
    newSpeechBubble.classList.add('speech', 'speech-human')
    chatbotConversation.appendChild(newSpeechBubble)
    newSpeechBubble.textContent = userInput.value
    userInput.value = ''
})

async function fetchReply() {
    let system_msg_obj = localStorage.getItem("instructionObj")
    conversationArr.push(system_msg_obj)
    let user_input_obj = localStorage.getItem("userInput")
    conversationArr.push(user_input_obj) 
    const response = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: conversationArr,
        temperature: 0.37,
        presence_penalty: 0.37,
        frequency_penalty: -0.37,
        max_tokens: 400
    })
    AIResponse = response.data.choices[0].message.content
    localStorage.setItem("AIResponse", response.data.choices[0].message) 
    push(conversationInDb, response.data.choices[0].message)
    renderTypewriterText(response.data.choices[0].message.content)
    responseContainer.appendChild(editableSpeechBubble)
    editableSpeechBubble.textContent = response.data.choices[0].message.content
}

function renderTypewriterText(text) {
    const newSpeechBubble = document.createElement('div')
    newSpeechBubble.classList.add('speech', 'speech-ai', 'blinking-cursor')
    chatbotConversation.appendChild(newSpeechBubble)
    let i = 0
    const interval = setInterval(() => {
        newSpeechBubble.textContent += text.slice(i - 1, i)
        if (text.length === i) {
            clearInterval(interval)
            newSpeechBubble.classList.remove('blinking-cursor')
        }
        i++
    }, 50)
}

document.getElementById('clear-btn').addEventListener('click', () => {
    localStorage.clear()
    chatbotConversation.innerHTML = '<div class="speech speech-ai">How can I help you?</div>'
    userInput.value = ''
})

document.getElementById('compare-btn').addEventListener('click', () => {
    conversationArr.push({
        role: 'user',
        content: editableSpeechBubble.textContent
    })
    push(conversationInDb, {
        role: 'user',
        content: editableSpeechBubble.textContent
    })
    highlightDifferentWords(AIResponse, editableSpeechBubble.textContent)
})

function renderConversationFromDb(){
    conversationArr.forEach(convarrObj => {
        const newSpeechBubble = document.createElement('div')
        newSpeechBubble.classList.add(
            'speech',
            `speech-${convarrObj.role === 'user' ? 'human' : 'ai'}`
        )
        chatbotConversation.appendChild(newSpeechBubble)
        newSpeechBubble.textContent = convarrObj.content
    })
}

function highlightDifferentWords(str1, str2) {
// Split the strings into arrays of words
    const words1 = str1.split(" ")
    const words2 = str2.split(" ")

    let difinreq = ''
    let difinres = ''
    
    // Iterate over the words in the first string
    for (let i = 0; i < words1.length; i++) {
        // Check if the word exists in the second string
        if (!words2.includes(words1[i])) {
            difinres += ` ${words1[i]}`
        }
    }

    // Iterate over the words in the second string
    for (let i = 0; i < words2.length; i++) {
        // Check if the word exists in the first string
        if (!words1.includes(words2[i])) {
            difinreq += ` ${words2[i]}`
        }
    }

    const sentences1 = str1.split(".")
    const sentences2 = str2.split(".")
    let difinstr = ''

    for (let i = 0; i < sentences1.length; i++) {
        if (sentences2.includes(sentences1[i])) {
            for (let j = 0; j < sentences2.length; j++) {
                if (sentences2[j].trim() === sentences1[i].trim()) {
                    difinstr += `Sentence ${(j + 1)} in expert answer moved to Sentence ${(i + 1)} in AI answer\n`;
                    break
                }
            }                
        }
    }
    
    const changesInResponse = document.createElement('div')
    changesInResponse.classList.add('track-changes-res')
    chatbotConversation.appendChild(changesInResponse)
    changesInResponse.textContent = difinres
    
    const changesInRequest = document.createElement('div')
    changesInRequest.classList.add('track-changes-req')
    chatbotConversation.appendChild(changesInRequest)
    changesInRequest.textContent = difinreq

    const changesInStructure = document.createElement('div')
    changesInStructure.classList.add('track-changes-str')
    chatbotConversation.appendChild(changesInStructure)
    changesInStructure.textContent = difinstr

}

renderConversationFromDb()
