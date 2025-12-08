document.addEventListener('DOMContentLoaded', () => {

    // =================================================================
    // 🔴 STEP 1: PASTE YOUR API KEY HERE
    // =================================================================
    const YOUR_API_KEY = "plln_sk_U8UNH5IInwBGiLbBBQxiiKaYXTW5DMA1"; // <--- DELETE THIS AND PASTE YOUR KEY
    // =================================================================

    // --- DOM Elements ---
    const storyInput = document.getElementById('story-input');
    const convertBtn = document.getElementById('convert-btn');
    const mainPromptTextarea = document.getElementById('main-prompt');
    const parseBtn = document.getElementById('parse-btn');
    const scenesContainer = document.getElementById('scenes-container');
    
    // Settings Inputs
    const textModelSelect = document.getElementById('text-model-select');
    const imageModelSelect = document.getElementById('image-model-select');
    const seedInput = document.getElementById('seed-input');
    const visualStyleInput = document.getElementById('visual-style-input');
    const widthInput = document.getElementById('width-input');
    const heightInput = document.getElementById('height-input');

    // --- SYSTEM PROMPT (ALEX V. ROMAN) ---
    const DIRECTOR_SYSTEM_PROMPT = `You are a world-class Scene Director and Visual Storyteller. Your name is Alex V. Roman, known for your meticulous attention to detail, your ability to establish a consistent and powerful mood, and your masterful translation of written text into breathtaking cinematic sequences.

Your mission is to take a story, provided by the user in either Hindi or English, and transform it into a series of detailed, consistent, and cinematic video prompts. You will analyze the story sentence by sentence, generating one unique video prompt for each sentence.

**Your Workflow:**

1.  **Holistic Analysis (The Vision):** Before generating any output, you will first perform a silent, internal analysis of the *entire* story. You must establish a consistent "Director's Vision" by identifying:
    * **Genre and Tone:** Is this a gritty neo-noir thriller, a vibrant fantasy epic, horror, etc.?
    * **Key Characters:** Identify the main characters for the dossier always make character beautiful and screen appealing.
    * **Setting, Mood, & Color Palette:** Establish the visual and emotional foundation of the world.

2.  **Character Dossier (The Master Reference):** After your internal analysis, your first output will be a concise **Character Dossier**. This dossier serves as the definitive visual reference sheet. For each main character, you will create a profile.
    * **Format:** Use a clear, bulleted list.
    * **Required Details:** Name, Gender, Age, Appearance, Hairstyle, Attire, Background context.

3.  **Scene-by-Scene Generation (The Craft):** Once the Character Dossier is established, you will proceed to generate the video prompts. You will process the story one sentence at a time.

**Rules for Each Prompt:**

* **One Sentence, One Prompt:** Strictly adhere to a one-to-one mapping.
* **Sequential Scene Numbering:** Each prompt must begin with \`Scene XXX:\` (e.g., Scene 001:, Scene 002:).
* **Character Consistency Marker:** This is a critical rule. Immediately following the first mention of a main character in **every prompt**, you MUST include a concise, bracketed summary of their key visual traits, condensed from the dossier.
    * **Format:** \`(Gender, Age, Key Appearance Trait, Hairstyle, Attire)\`
* **English Only:** Prompts must be generated in English.
* **Prompt Anatomy:** Each prompt must be a rich paragraph containing: Shot Type & Angle, Subject & Action, Environment & Background, Lighting, Atmosphere & Mood, Key Style Descriptors.

**Formatting:**
* The Character Dossier is presented first.
* Then each scene prompt follows.
* **IMPORTANT:** Do NOT use Markdown code blocks (\`\`\`). Output plain text only so it can be easily parsed.`;

    // --- Initial Setup ---
    fetchAndPopulateModels(); 

    // --- Event Listeners ---
    convertBtn.addEventListener('click', handleStoryConversion);
    parseBtn.addEventListener('click', handleParse);
    scenesContainer.addEventListener('click', handleSceneActions);

    // --- Functions ---

    // 🆕 NEW: Handle Story Conversion
    async function handleStoryConversion() {
        const story = storyInput.value.trim();
        if (!story) {
            alert("Please paste a story first.");
            return;
        }

        if (!YOUR_API_KEY || YOUR_API_KEY.length < 10) {
            alert("Error: Please paste your API Key in script.js line 6");
            return;
        }

        const originalBtnText = convertBtn.innerText;
        convertBtn.innerText = "🎬 Director is analyzing story...";
        convertBtn.disabled = true;
        
        // Clear previous content
        mainPromptTextarea.value = "Analyzing story and generating scenes... This may take a few seconds.";

        try {
            // We use POST to allow for the long system prompt + story
            const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${YOUR_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'openai', 
                    messages: [
                        { role: "system", content: DIRECTOR_SYSTEM_PROMPT },
                        { role: "user", content: story }
                    ]
                })
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error("Director API failed: " + err);
            }
            
            const data = await response.json();
            let generatedText = data.choices[0].message.content;

            // Cleanup: The AI might still use ``` blocks despite instructions. Remove them.
            generatedText = generatedText.replace(/```/g, ''); 

            // Place result in main textarea
            mainPromptTextarea.value = generatedText;
            
            // Automatically click parse for user convenience
            handleParse();

        } catch (error) {
            console.error(error);
            alert("Error converting story: " + error.message);
            mainPromptTextarea.value = "";
        } finally {
            convertBtn.innerText = originalBtnText;
            convertBtn.disabled = false;
        }
    }

    async function fetchAndPopulateModels() {
        try {
            // Fetch Text Models
            const textRes = await fetch('https://gen.pollinations.ai/text/models');
            if (textRes.ok) {
                const textModels = await textRes.json();
                populateSelect(textModelSelect, textModels, 'openai');
            } else {
                populateSelect(textModelSelect, ['openai', 'gemini', 'mistral'], 'openai');
            }

            // Fetch Image Models
            const imgRes = await fetch('https://gen.pollinations.ai/image/models');
            if (imgRes.ok) {
                const imgModels = await imgRes.json();
                populateSelect(imageModelSelect, imgModels, 'flux');
            } else {
                populateSelect(imageModelSelect, ['flux', 'turbo', 'midjourney'], 'flux');
            }

        } catch (error) {
            console.error("Error fetching models:", error);
            textModelSelect.innerHTML = '<option value="openai">OpenAI (Default)</option>';
            imageModelSelect.innerHTML = '<option value="flux">Flux (Default)</option>';
        }
    }

    function populateSelect(selectElement, modelsData, defaultModel) {
        selectElement.innerHTML = '';
        modelsData.forEach(modelItem => {
            const modelName = typeof modelItem === 'string' ? modelItem : modelItem.name;
            const option = document.createElement('option');
            option.value = modelName;
            option.textContent = modelName.charAt(0).toUpperCase() + modelName.slice(1);
            if (modelName === defaultModel) option.selected = true;
            selectElement.appendChild(option);
        });
    }

    function handleParse() {
        const fullText = mainPromptTextarea.value.trim();
        if (!fullText) {
            alert('Please paste a prompt first.');
            return;
        }

        // Split by "Scene #1:", "Scene 001:", etc.
        const prompts = fullText.split(/\s*Scene\s*#?\s*\d+:\s*/i).filter(p => p.trim() !== '');

        if (prompts.length === 0) {
            displayScenes([fullText]);
            return;
        }

        displayScenes(prompts);
    }

    function displayScenes(prompts) {
        scenesContainer.innerHTML = '';
        prompts.forEach((prompt, index) => {
            // Because our Director Output puts Dossier first, prompt[0] is the Dossier/Context
            
            const sceneCard = document.createElement('div');
            sceneCard.className = 'scene-card';
            
            let contextHtml = '';
            let buttonsHtml = '';

            const generateBtn = `<button class="generate-btn" title="Use Master Seed">Generate Image</button>`;
            const regenerateBtn = `<button class="regenerate-btn" title="Use Random Seed">🔄 Regenerate</button>`;
            const downloadBtn = `<button class="download-btn" title="Save Image with Name">⬇️ Download</button>`;

            if (index === 0) {
                contextHtml = `<div class="context-badge">📝 CHARACTER DOSSIER / CONTEXT</div>`;
                // We usually don't image-gen the dossier text, but we leave buttons just in case user wants to.
                buttonsHtml = `<div class="button-group">${generateBtn}${regenerateBtn}</div>`;
            } else {
                buttonsHtml = `
                    <div class="button-group">
                        <button class="enhance-btn">✨ Refine with AI</button>
                        ${generateBtn}
                        ${regenerateBtn}
                        ${downloadBtn}
                    </div>
                `;
            }

            // Adjust display title: Index 0 is Dossier, Index 1 is Scene 1
            let displayTitle = index === 0 ? "Character Dossier" : `Scene #${index}`;

            sceneCard.innerHTML = `
                ${contextHtml}
                <h3>${displayTitle}</h3>
                
                <div class="image-container" style="margin-bottom: 15px;">
                    <span>Image will appear here.</span>
                </div>

                <textarea class="scene-prompt" rows="6">${prompt.trim()}</textarea>
                ${buttonsHtml}
            `;

            scenesContainer.appendChild(sceneCard);
        });
    }

    function handleSceneActions(e) {
        const target = e.target;
        if (target.classList.contains('generate-btn')) generateImage(target, false);
        else if (target.classList.contains('regenerate-btn')) generateImage(target, true);
        else if (target.classList.contains('enhance-btn')) enhancePromptText(target);
        else if (target.classList.contains('download-btn')) downloadSceneImage(target);
    }

    function downloadSceneImage(button) {
        const sceneCard = button.closest('.scene-card');
        const img = sceneCard.querySelector('.image-container img');
        const promptText = sceneCard.querySelector('.scene-prompt').value;
        const sceneTitle = sceneCard.querySelector('h3').innerText;

        if (!img || !img.src) {
            alert("Please generate an image for this scene first.");
            return;
        }

        const safeScene = sceneTitle.replace(/[^a-z0-9]/gi, '_');
        const safePrompt = promptText.trim().substring(0, 50).replace(/[^a-z0-9]/gi, '_');
        const filename = `${safeScene}_${safePrompt}.png`;

        const a = document.createElement('a');
        a.href = img.src;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    async function enhancePromptText(button) {
        const sceneCard = button.closest('.scene-card');
        const promptTextarea = sceneCard.querySelector('.scene-prompt');
        const currentPrompt = promptTextarea.value.trim();
        // Context is always the first card's textarea
        const firstSceneTextarea = document.querySelector('.scene-card textarea.scene-prompt');
        if (!firstSceneTextarea) return;
        const contextText = firstSceneTextarea.value.trim();
        const textModel = textModelSelect.value;

        if (!YOUR_API_KEY || YOUR_API_KEY.length < 10) {
            alert("Error: Please paste your API Key in script.js");
            return;
        }

        const originalBtnText = button.innerText;
        button.innerText = `Refining (${textModel})...`;
        button.disabled = true;

        try {
            const promptEncoded = encodeURIComponent(currentPrompt);
            const systemEncoded = encodeURIComponent("You are a creative writing assistant. Improve this scene description based on the global context provided. Keep it descriptive but concise for image generation. Context: " + contextText);
            
            const url = `https://gen.pollinations.ai/text/${promptEncoded}?model=${textModel}&system=${systemEncoded}&private=true`;

            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${YOUR_API_KEY}` }
            });

            if (!response.ok) throw new Error(`Text API Error: ${response.status}`);
            
            const enhancedText = await response.text();
            if (enhancedText) promptTextarea.value = enhancedText;

        } catch (error) {
            console.error(error);
            alert("Failed to refine text: " + error.message);
        } finally {
            button.innerText = originalBtnText;
            button.disabled = false;
        }
    }

    async function generateImage(button, useRandomSeed) {
        const sceneCard = button.closest('.scene-card');
        const promptTextarea = sceneCard.querySelector('.scene-prompt');
        const imageContainer = sceneCard.querySelector('.image-container');
        
        const sceneSpecificPrompt = promptTextarea.value.trim();
        const visualStyle = visualStyleInput.value.trim();
        const width = parseInt(widthInput.value, 10) || 1920;
        const height = parseInt(heightInput.value, 10) || 1080;
        
        const model = imageModelSelect.value;
        let seed = useRandomSeed ? Math.floor(Math.random() * 999999999) : (seedInput.value.trim() || 42);

        if (!sceneSpecificPrompt) {
            alert('Prompt is empty.');
            return;
        }

        if (!YOUR_API_KEY || YOUR_API_KEY.length < 10) {
            alert("Error: Please paste your API Key in script.js");
            return;
        }

        let finalPrompt = visualStyle ? `${sceneSpecificPrompt}, ${visualStyle} style` : sceneSpecificPrompt;

        imageContainer.innerHTML = '<div class="loader"></div>';

        const encodedPrompt = encodeURIComponent(finalPrompt);
        const baseUrl = `https://gen.pollinations.ai/image/${encodedPrompt}`;
        const params = new URLSearchParams({
            width: width, height: height, seed: seed, model: model, nologo: 'true', private: 'true', enhance: 'false'
        });
        const fullUrl = `${baseUrl}?${params.toString()}`;

        try {
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${YOUR_API_KEY}` }
            });

            if (!response.ok) {
                let errorMsg = response.statusText;
                try { const errorJson = await response.json(); errorMsg = JSON.stringify(errorJson); } catch(e) {}
                throw new Error(`API Error ${response.status}: ${errorMsg}`);
            }

            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);
            const img = new Image();
            img.src = imageUrl;
            img.onload = () => {
                imageContainer.innerHTML = '';
                imageContainer.appendChild(img);
            };

        } catch (error) {
            console.error(error);
            imageContainer.innerHTML = `<span style="color: #ff6b6b; padding:10px; display:block;">${error.message}</span>`;
        }
    }
});
