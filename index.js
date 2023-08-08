import { initializeApp } from 'firebase/app'
import { getDatabase, ref, push, get, remove } from 'firebase/database'

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

let AIResponse = ''

const instructionObj = {
    role: 'system',
    content: `
    You are a very experienced radiologist with
    specialization in knee MRI scans.
    You will be provided with a context of a knee MRI report.
    You have to summarize the same in 50 words
    in a section titled "Impression"
    while strictly following the report template provided, delimited with
    "####" characters.
    Make sure to retain the chronological order of the paragraphs specific to different parts of the knee, delimited with "###" characters, in the "Impression" section.
    Make the word "Impression" bold in your final output.
    Do not make any suggestions in the "Impression" section.
    Do not include in your summary whatever knee structures
    have not been explicitly mentioned in the context.
    Make sure to include any negative comments or points of concern which have been mentioned
    or referred to in the context.
    ####
    Impression:
    ###
    about medial compartment bone marrow, articular cartilage, medial meniscus, medial collateral ligament (MCL)
    ###
    ###
    about lateral compartment bone marrow, articular cartilage, lateral meniscus, iliotibial band, biceps femoris, fibular collateral ligament (LCL), popliteus muscle
    ###
    ###
    about patellar position, patellofemoral cartilage, patellofemoral ligaments, quadriceps tendon, patellar tendon
    ###
    ###
    about anterior cruciate ligament (ACL), posterior cruciate ligament (PCL)
    ###
    ###
    about suprapatellar bursa, bakers cyst (popliteal cyst), popliteus tendon sheath, pes anserinus bursa, prepatellar bursa
    ###
    ####
    `
}

document.addEventListener('submit', (e) => {
    e.preventDefault()
    push(conversationInDb, {
        role: 'user',
        content: userInput.value
    })
    fetchReply()
    const newSpeechBubble = document.createElement('div')
    newSpeechBubble.classList.add('speech', 'speech-human')
    chatbotConversation.appendChild(newSpeechBubble)
    newSpeechBubble.textContent = userInput.value
    userInput.value = ''
})

async function fetchReply() {
    get(conversationInDb).then(async (snapshot) => {
        if (snapshot.exists()) {
            const conversationArr = Object.values(snapshot.val())
            const context = [instructionObj, conversationArr[conversationArr.length - 1]]
            const response = await openai.createChatCompletion({
                model: 'gpt-3.5-turbo',
                messages: context,
                temperature: 0.37,
                presence_penalty: 0.37,
                frequency_penalty: -0.37,
                max_tokens: 180
            })
            AIResponse = response.data.choices[0].message.content.replace(/#/g, "") 
            push(conversationInDb, {
                role: 'assistant',
                content: AIResponse
            })
            renderTypewriterText(AIResponse)
            responseContainer.innerHTML = AIResponse
            tinymce.init({
				selector: '#response-container'
			});
        }
        else {
            console.log('No data available')
        }
    })
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
    chatbotConversation.innerHTML = '<div class="speech speech-ai">How can I help you?</div>'
    userInput.value = ''
})

document.getElementById('compare-btn').addEventListener('click', () => {
    push(conversationInDb, {
        role: 'user',
        content: responseContainer.textContent
    })
    highlightDifferentWords(AIResponse, responseContainer.textContent)
})

function renderConversationFromDb(){
    get(conversationInDb).then(async (snapshot)=>{
        if(snapshot.exists()) {
            Object.values(snapshot.val()).forEach(dbObj => {
                const newSpeechBubble = document.createElement('div')
                newSpeechBubble.classList.add(
                    'speech',
                    `speech-${dbObj.role === 'user' ? 'human' : 'ai'}`
                    )
                chatbotConversation.appendChild(newSpeechBubble)
                newSpeechBubble.textContent = dbObj.content
            })
        }
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
