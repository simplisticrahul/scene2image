document.addEventListener('DOMContentLoaded', () => {

    // =================================================================
    // 🔴 API KEY
    // =================================================================
    const YOUR_API_KEY = "plln_sk_U8UNH5IInwBGiLbBBQxiiKaYXTW5DMA1"; 
    // =================================================================

    // --- DOM Elements ---
    const ideaInput = document.getElementById('idea-input');
    const writeBtn = document.getElementById('write-btn');
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

    // --- SYSTEM PROMPTS ---
    const WRITER_SYSTEM_PROMPT = `You are a best content writer. 
    Your task: Write a good, highly visual story or video based on the user's idea. 
    Constraint: Keep it long . Focus on descriptions, lighting, and action. 
    Language: English or Hindi (match user's input language).`;

    const DIRECTOR_SYSTEM_PROMPT = `You are a world-class Scene Director and Visual Storyteller. Your name is Alex V. Roman.
Your mission is to take a story, provided by the user in either Hindi or English, and transform it into a series of detailed, consistent, and cinematic video prompts.
    
**Your Workflow:**
1. **Holistic Analysis:** Analyze Genre, Tone, Characters, Setting.
2. **Character Dossier:** First output a character dossier (Name, Gender, Age, Appearance, Hairstyle, Attire).
3. **Scene-by-Scene Generation:** Process story sentence by sentence.

**Rules for Each Prompt:**
* **One Sentence, One Prompt.**
* **Sequential Scene Numbering:** Start with "Scene 001:", "Scene 002:", etc.
* **Character Consistency Marker:** Immediately following the first mention of a main character in every prompt, include: (Gender, Age, Key Appearance Trait, Hairstyle, Attire).
* **English Only.**
* **Prompt Anatomy:** Shot Type, Subject & Action, Environment, Lighting, Atmosphere, Key Style Descriptors.

**Formatting:**
* Output the Character Dossier first.
* Then output the Scenes.
* Do NOT use markdown code blocks (like \`\`\`). Just output plain text.`;

    // --- Initial Setup ---
    // Start loading models immediately
    fetchAndPopulateModels(); 

    // --- Event Listeners ---
    if(writeBtn) writeBtn.addEventListener('click', handleWriteStory);
    if(convertBtn) convertBtn.addEventListener('click', () => handleStoryConversion(true));
    parseBtn.addEventListener('click', handleParse);
    scenesContainer.addEventListener('click', handleSceneActions);

    // --- Functions ---

    // 🆕 1. ROBUST MODEL FETCHING (THE FIX)
    async function fetchAndPopulateModels() {
        // Fallback lists in case API fails
        const fallbackTextModels = ['openai', 'mistral', 'gemini', 'qwen-coder'];
        const fallbackImageModels = ['flux', 'gemini-search', 'turbo', 'midjourney'];

        try {
            // Fetch Text Models
            try {
                const textRes = await fetch('https://gen.pollinations.ai/text/models');
                if (textRes.ok) {
                    const data = await textRes.json();
                    populateSelect(textModelSelect, data, 'openai');
                } else {
                    throw new Error("Text models endpoint failed");
                }
            } catch (e) {
                console.warn("Using fallback text models:", e);
                populateSelect(textModelSelect, fallbackTextModels, 'openai');
            }

            // Fetch Image Models
            try {
                const imgRes = await fetch('https://gen.pollinations.ai/image/models');
                if (imgRes.ok) {
                    const data = await imgRes.json();
                    populateSelect(imageModelSelect, data, 'flux');
                } else {
                    throw new Error("Image models endpoint failed");
                }
            } catch (e) {
                console.warn("Using fallback image models:", e);
                populateSelect(imageModelSelect, fallbackImageModels, 'flux');
            }

        } catch (error) {
            console.error("Critical error in model fetching:", error);
            // Absolute safety net
            populateSelect(textModelSelect, fallbackTextModels, 'openai');
            populateSelect(imageModelSelect, fallbackImageModels, 'flux');
        }
    }

    function populateSelect(selectElement, modelsData, defaultModel) {
        selectElement.innerHTML = '';
        
        // Handle array of strings OR array of objects
        modelsData.forEach(modelItem => {
            const modelName = typeof modelItem === 'string' ? modelItem : modelItem.name;
            if(!modelName) return; // Skip invalid entries

            const option = document.createElement('option');
            option.value = modelName;
            option.textContent = modelName.charAt(0).toUpperCase() + modelName.slice(1);
            
            if (modelName === defaultModel) option.selected = true;
            selectElement.appendChild(option);
        });
    }

    // 2. WRITER FUNCTION
    async function handleWriteStory() {
        const idea = ideaInput.value.trim();
        if (!idea) { alert("Please enter a story idea."); return; }

        const originalText = writeBtn.innerText;
        writeBtn.innerText = "✍️ Writing...";
        writeBtn.disabled = true;
        storyInput.value = "AI is writing your story...";

        try {
            const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${YOUR_API_KEY}` },
                body: JSON.stringify({
                    model: 'gemini-search', 
                    messages: [
                        { role: "system", content: WRITER_SYSTEM_PROMPT },
                        { role: "user", content: idea }
                    ]
                })
            });

            if (!response.ok) throw new Error("Writer API Failed");
            const data = await response.json();
            storyInput.value = data.choices[0].message.content;

            writeBtn.innerText = "🎬 Sending to Director...";
            await handleStoryConversion(false); 

        } catch (error) {
            console.error(error);
            alert("Writing failed: " + error.message);
        } finally {
            writeBtn.innerText = originalText;
            writeBtn.disabled = false;
        }
    }

    // 3. DIRECTOR FUNCTION
    async function handleStoryConversion(isManualClick) {
        const story = storyInput.value.trim();
        if (!story) {
            if(isManualClick) alert("Please paste a story first.");
            return;
        }

        const originalBtnText = convertBtn.innerText;
        convertBtn.innerText = "🎬 Analyzing...";
        convertBtn.disabled = true;
        mainPromptTextarea.value = "Director is creating scenes... please wait.";

        try {
            const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${YOUR_API_KEY}` },
                body: JSON.stringify({
                    model: 'openai', 
                    messages: [
                        { role: "system", content: DIRECTOR_SYSTEM_PROMPT },
                        { role: "user", content: story }
                    ]
                })
            });

            if (!response.ok) throw new Error("Director API failed");
            
            const data = await response.json();
            let generatedText = data.choices[0].message.content;
            generatedText = generatedText.replace(/```/g, ''); 

            mainPromptTextarea.value = generatedText;
            handleParse();

        } catch (error) {
            console.error(error);
            if(isManualClick) alert("Error converting story: " + error.message);
        } finally {
            convertBtn.innerText = originalBtnText;
            convertBtn.disabled = false;
        }
    }

    // 4. PARSING SCENES
    function handleParse() {
        const fullText = mainPromptTextarea.value.trim();
        if (!fullText) return;

        const prompts = fullText.split(/\s*Scene\s*#?\s*\d+:\s*/i).filter(p => p.trim() !== '');

        if (prompts.length === 0) {
            displayScenes([fullText]);
            return;
        }
        displayScenes(prompts);
    }

    // 5. DISPLAY SCENES
    function displayScenes(prompts) {
        scenesContainer.innerHTML = '';
        prompts.forEach((prompt, index) => {
            const isDossier = (index === 0 && (prompt.includes("Gender") || prompt.includes("Dossier") || prompt.includes("Context")));
            const sceneCard = document.createElement('div');
            sceneCard.className = 'scene-card';
            
            let displayTitle = isDossier ? "📝 Character Dossier / Context" : `Scene #${index + 1}`;
            
            let buttonsHtml = '<div class="button-group">';
            if (!isDossier) buttonsHtml += `<button class="enhance-btn">✨ Refine</button>`;
            buttonsHtml += `
                <button class="generate-btn">Generate Image</button>
                <button class="regenerate-btn">🔄 Regenerate</button>
                <button class="download-btn">⬇️ Download</button>
            </div>`;

            sceneCard.innerHTML = `
                ${isDossier ? '<div class="context-badge">MASTER REFERENCE</div>' : ''}
                <h3>${displayTitle}</h3>
                <div class="image-container" style="margin-bottom: 15px;"><span>Image will appear here.</span></div>
                <textarea class="scene-prompt" rows="6">${prompt.trim()}</textarea>
                ${buttonsHtml}
            `;
            scenesContainer.appendChild(sceneCard);
        });
    }

    // 6. ACTION DELEGATION
    function handleSceneActions(e) {
        const target = e.target;
        if (target.classList.contains('generate-btn')) generateImage(target, false);
        else if (target.classList.contains('regenerate-btn')) generateImage(target, true);
        else if (target.classList.contains('enhance-btn')) enhancePromptText(target);
        else if (target.classList.contains('download-btn')) downloadSceneImage(target);
    }

    // 7. DOWNLOAD
    function downloadSceneImage(button) {
        const sceneCard = button.closest('.scene-card');
        const img = sceneCard.querySelector('.image-container img');
        if (!img || !img.src) { alert("Please generate an image first."); return; }

        const a = document.createElement('a');
        a.href = img.src;
        a.download = `scene_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // 8. TEXT REFINEMENT
    async function enhancePromptText(button) {
        const sceneCard = button.closest('.scene-card');
        const promptTextarea = sceneCard.querySelector('.scene-prompt');
        const contextText = document.querySelector('.scene-prompt').value || ""; 
        
        const originalBtnText = button.innerText;
        button.innerText = `Refining...`;
        button.disabled = true;

        try {
            const promptEncoded = encodeURIComponent(promptTextarea.value);
            const systemEncoded = encodeURIComponent("Improve this scene description. Context: " + contextText);
            
            const url = `https://gen.pollinations.ai/text/${promptEncoded}?model=${textModelSelect.value}&system=${systemEncoded}&private=true`;
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${YOUR_API_KEY}` } });
            if (!response.ok) throw new Error("Text API Error");
            
            promptTextarea.value = await response.text();

        } catch (error) {
            alert("Refine failed: " + error.message);
        } finally {
            button.innerText = originalBtnText;
            button.disabled = false;
        }
    }

    // 9. IMAGE GENERATION
    async function generateImage(button, useRandomSeed) {
        const sceneCard = button.closest('.scene-card');
        const promptTextarea = sceneCard.querySelector('.scene-prompt');
        const imageContainer = sceneCard.querySelector('.image-container');
        
        const sceneSpecificPrompt = promptTextarea.value.trim();
        const visualStyle = visualStyleInput.value.trim();
        const width = widthInput.value || 1920;
        const height = heightInput.value || 1080;
        const model = imageModelSelect.value;
        let seed = useRandomSeed ? Math.floor(Math.random() * 999999999) : (seedInput.value || 42);

        if (!sceneSpecificPrompt) return;

        let finalPrompt = visualStyle ? `${sceneSpecificPrompt}, ${visualStyle} style` : sceneSpecificPrompt;
        imageContainer.innerHTML = '<div class="loader"></div>';

        const encodedPrompt = encodeURIComponent(finalPrompt);
        const params = new URLSearchParams({
            width: width, height: height, seed: seed, model: model, nologo: 'true', enhance: 'false'
        });

        const fullUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?${params.toString()}`;

        try {
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${YOUR_API_KEY}` }
            });

            if (!response.ok) throw new Error("Image API Error");

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
            imageContainer.innerHTML = `<span style="color: #ff6b6b;">${error.message}</span>`;
        }
    }
});