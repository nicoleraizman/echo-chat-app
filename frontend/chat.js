class ChatRoom {
    constructor() {
        this.username = localStorage.getItem("nickname") || "Guest";
        
        // Extract topic from URL (defaults to Recruitment_law if none provided)
        const urlParams = new URLSearchParams(window.location.search);
        this.topic = urlParams.get('topic') || 'Recruitment_law';
        
        this.isSending = false;
        this.userScrolledUp = false;
        this.displayedMessageIds = new Set();
        this.viewMode = 'all';
        
        // Use a Set to remember all dates we have drawn
        this.displayedDates = new Set(); 

        // Dictionary holding specific data for each topic
        this.topicData = {
            'Recruitment_law': {
                title: 'חוק הגיוס',
                desc: 'חוק הגיוס עוסק בהסדרת חובת הגיוס לצה"ל, ובפרט בסוגיית הפטור לתלמידי ישיבות. הנושא מעורר מחלוקת עמוקה בחברה הישראלית סביב שאלות של שוויון בנטל, צורכי הביטחון ושמירת אורח החיים החרדי.',
                color: '#5b8a72' 
            },
            'Legal_reform': {
                title: 'הרפורמה המשפטית',
                desc: 'הרפורמה המשפטית כוללת סדרת שינויים מוצעים במערכת המשפט, שמטרתם לשנות את מאזן הכוחות בין הרשויות. הדיון נסוב סביב מהות הדמוקרטיה, שלטון החוק, זכויות מיעוטים ועצמאות בית המשפט העליון.',
                color: '#b13342' 
            },
            'Elections_2026': {
                title: 'בחירות לכנסת 2026',
                desc: 'מערכת הבחירות מציפה את שאלות היסוד של החברה הישראלית. הדיון בחדר זה מתמקד בנושאי ביטחון, כלכלה, דת ומדינה, וכן בחזון לגבי כיוונה העתידי של ישראל בשנים הקרובות.',
                color: '#4A90E2' 
            },
            'Bibi_trial': {
                title: 'תיקי נתניהו',
                desc: 'תיקי נתניהו עוסקים בהליכים המשפטיים המתנהלים נגד ראש הממשלה. המשפט מעורר פולמוס ציבורי נרחב בשאלות של טוהר המידות, תקשורת ופוליטיקה, לצד שאלות על אמון הציבור במערכות אכיפת החוק.',
                color: '#F5A623' 
            }
        };

        this.initUI();
        this.setupEventListeners();
        this.startPolling();
    }

    clearChatBox() {
        const chatBox = document.getElementById("chatMessages");
        if (chatBox) chatBox.innerHTML = "";
        this.displayedMessageIds.clear();
        this.displayedDates.clear(); // Clear dates memory when switching filters
    }

    initUI() {
        const data = this.topicData[this.topic];
        if (data) {
            // Update Header & Modal text
            document.getElementById('headerTitle').textContent = data.title;
            document.getElementById('modalTitle').textContent = data.title;
            document.getElementById('modalDesc').textContent = data.desc;
            
            // Dynamically change header color & modal border!
            const header = document.getElementById('mainChatHeader');
            const modalBox = document.getElementById('modalContentBox');
            
            if (header) header.style.backgroundColor = data.color;
            if (modalBox) modalBox.style.borderTopColor = data.color;
        }
    }

    setupEventListeners() {
        document.getElementById("sendButton").addEventListener("click", () => this.handleSendMessage());
        
        document.getElementById("chatInput").addEventListener("keydown", (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                this.handleSendMessage();
            }
        });

        document.getElementById("menuButton").addEventListener("click", () => {
            const menu = document.getElementById('menu');
            menu.style.display = (menu.style.display === 'flex') ? 'none' : 'flex';
        });
        
        const showMineBtn = document.getElementById("showMineBtn");
        const showAllBtn = document.getElementById("showAllBtn");

        if (showMineBtn && showAllBtn) {
            showMineBtn.addEventListener("click", () => {
                this.viewMode = 'mine';
                this.clearChatBox();
                this.fetchAndDisplayMessages(); // Instantly refresh
            });

            showAllBtn.addEventListener("click", () => {
                this.viewMode = 'all';
                this.clearChatBox();
                this.fetchAndDisplayMessages(); // Instantly refresh
            });
        }
        
        // --- Modal Pop-up Logic ---
        const titleContainer = document.getElementById("titleContainer");
        const topicModal = document.getElementById("topicModal");
        const closeModalBtn = document.getElementById("closeModalBtn");

        if (titleContainer && topicModal && closeModalBtn) {
            // Open modal
            titleContainer.addEventListener("click", () => {
                topicModal.classList.remove("hidden");
            });

            // Close modal via button
            closeModalBtn.addEventListener("click", () => {
                topicModal.classList.add("hidden");
            });

            // Close modal by clicking the dark background outside the box
            topicModal.addEventListener("click", (e) => {
                if (e.target === topicModal) {
                    topicModal.classList.add("hidden");
                }
            });
        }

        const chatBox = document.getElementById("chatMessages");
        if (chatBox) {
            chatBox.addEventListener("scroll", () => {
                const nearBottom = chatBox.scrollHeight - chatBox.scrollTop <= chatBox.clientHeight + 50;
                this.userScrolledUp = !nearBottom;
            });
        }
        // --- Cancel AI Options by Clicking Outside ---
        document.addEventListener("click", (event) => {
            const optionsDiv = document.getElementById("messageOptions");
            const sendButton = document.getElementById("sendButton");
            
            // If the options menu is currently open on the screen...
            if (optionsDiv && optionsDiv.style.display === 'flex') {
                // And the user clicked OUTSIDE the options box and NOT on the send button...
                if (!optionsDiv.contains(event.target) && event.target !== sendButton) {
                    // Hide the options!
                    optionsDiv.style.display = 'none'; 
                }
            }
        });
    }

    async handleSendMessage() {
        if (this.isSending) return;
        this.isSending = true;

        const chatInput = document.getElementById("chatInput");
        const inputMessage = chatInput.value.trim();
        
        if (!inputMessage) {
            this.isSending = false;
            return;
        }

        try {
            // SECURE CALL: Asking our own backend to evaluate the message via Groq
            const response = await fetch("https://echo-solo-backend.onrender.com/moderate-message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: inputMessage })
            });

            const result = await response.json();

            if (result.isRespectful) {
                await this.sendToBackend(inputMessage);
                chatInput.value = "";
            } else if (result.rewrittenMessages && result.rewrittenMessages.length > 0) {
                this.displayMessageOptions(result.rewrittenMessages, inputMessage);
            } else {
                // FALLBACK: Block the message if the AI gets confused!
                alert("מערכת הסינון נתקלה בשגיאה (או שההודעה אינה הולמת ולא נמצאו חלופות). אנא נסח מחדש ונסה שוב.");
                this.isSending = false;
            }
        } catch (error) {
            console.error("Error during message processing:", error);
        } finally {
            this.isSending = false;
        }
    }

    displayMessageOptions(rewrittenMessages, originalMessage) {
        const messageOptionsDiv = document.getElementById("messageOptions");
        messageOptionsDiv.innerHTML = '';

        const promptMessage = document.createElement("div");
        promptMessage.textContent = "הניסוח שלך עשוי להתפרש כלא מכבד. אנא בחר ניסוח חלופי, או לחץ מחוץ לאפשרויות כדי לבטל:";
        promptMessage.style.marginBottom = "10px";
        promptMessage.style.textAlign = "right";
        messageOptionsDiv.appendChild(promptMessage);

        rewrittenMessages.forEach((messageText) => {
            const optionButton = document.createElement("button");
            optionButton.classList.add("message-option-button");
            optionButton.textContent = messageText;
            optionButton.onclick = () => {
                this.sendToBackend(messageText);
                messageOptionsDiv.style.display = 'none';
                document.getElementById("chatInput").value = "";
            };
            messageOptionsDiv.appendChild(optionButton);
        });

        messageOptionsDiv.style.display = 'flex';
        messageOptionsDiv.style.flexDirection = 'column';
        messageOptionsDiv.style.gap = '10px';
    }

    async sendToBackend(message) {
        try {
            await fetch("https://echo-solo-backend.onrender.com/send-message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: this.username, content: message, topic: this.topic })
            });
            setTimeout(() => this.fetchAndDisplayMessages(), 1000);
        } catch (error) {
            console.error("Error sending message to backend:", error);
        }
    }

    async fetchAndDisplayMessages() {
        this.currentFetchId = (this.currentFetchId || 0) + 1;
        const myFetchId = this.currentFetchId;

        try {
            // Decide which URL to use based on the current mode
            let messagesUrl = `https://echo-solo-backend.onrender.com/messages?topic=${encodeURIComponent(this.topic)}`;
            
            if (this.viewMode === 'mine') {
                messagesUrl = `https://echo-solo-backend.onrender.com/api/messages/user/${encodeURIComponent(this.username)}`;
            }

            const [messagesRes, reactionsRes] = await Promise.all([
                fetch(messagesUrl), 
                fetch(`https://echo-solo-backend.onrender.com/reactions?topic=${encodeURIComponent(this.topic)}`)
            ]);

            const messages = await messagesRes.json();
            const reactions = await reactionsRes.json();

            // 🚀 THE FIX: If the user clicked a button while we were waiting for the database,
            // our ticket number is now old. Throw this data away to prevent mixing!
            if (this.currentFetchId !== myFetchId) {
                return; 
            }

            const reactionMap = {};
            reactions.forEach(r => {
                reactionMap[r.message_id] = {
                    like: r.likes,
                    dislike: r.dislikes,
                    user_reaction: r.username === this.username ? r.reaction : null
                };
            });

            const chatBox = document.getElementById("chatMessages");

            messages.forEach(msg => {
                const msgDate = new Date(msg.created_at);
                const dateOnly = msgDate.toLocaleDateString('he-IL');

                if (!this.displayedDates.has(dateOnly)) {
                    const wrapper = document.createElement("div");
                    wrapper.style.textAlign = "center";
                    wrapper.innerHTML = `<div class="date-divider">${dateOnly}</div>`;
                    chatBox.appendChild(wrapper);
                    
                    this.displayedDates.add(dateOnly); 
                }

                const fullMessage = `${msg.username}: ${msg.content}`;
                const msgType = msg.username === this.username ? "self" : "other";
                const msgReactions = reactionMap[msg.id] || { like: 0, dislike: 0 };
                
                this.displaySingleMessage(fullMessage, msgType, msg.created_at, msg.id, msgReactions, chatBox);
            });
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    }

    displaySingleMessage(message, type, timestamp, messageId, reactions, chatBox) {
        // SMART UPDATE: If message is already on screen, just update the likes/dislikes!
        if (this.displayedMessageIds.has(messageId)) {
            const likeSpan = document.getElementById(`like-count-${messageId}`);
            const dislikeSpan = document.getElementById(`dislike-count-${messageId}`);
            
            if (likeSpan) {
                likeSpan.textContent = reactions.like || 0;
                if (reactions.user_reaction === 'like') likeSpan.parentElement.classList.add('active');
                else likeSpan.parentElement.classList.remove('active');
            }
            if (dislikeSpan) {
                dislikeSpan.textContent = reactions.dislike || 0;
                if (reactions.user_reaction === 'dislike') dislikeSpan.parentElement.classList.add('active');
                else dislikeSpan.parentElement.classList.remove('active');
            }
            return; 
        }

        this.displayedMessageIds.add(messageId);

        const wrapper = document.createElement("div");
        wrapper.className = `message-wrapper ${type}`;

        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message", type);

        const [sender, ...contentParts] = message.split(": ");
        const content = contentParts.join(": ");

        messageDiv.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 4px; color: ${this.getColorForUsername(sender)};">${sender}</div>
            <div>${this.formatMarkdownBold(content)}</div>
            <div style="font-size: 0.7rem; color: #666; margin-top: 4px;">
                ${new Date(timestamp).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit' })}
            </div>
        `;

        const reactionsDiv = document.createElement("div");
        reactionsDiv.classList.add("reactions");
        
        const isSelfMessage = sender === this.username;
        reactionsDiv.appendChild(this.createReactionBubble("👍", reactions.like, "like", isSelfMessage, messageId, reactions.user_reaction));
        reactionsDiv.appendChild(this.createReactionBubble("👎", reactions.dislike, "dislike", isSelfMessage, messageId, reactions.user_reaction));

        wrapper.appendChild(messageDiv);
        wrapper.appendChild(reactionsDiv);
        chatBox.appendChild(wrapper);

        if (!this.userScrolledUp) {
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    }

    createReactionBubble(emoji, count, type, disabled, messageId, userReaction) {
        const bubble = document.createElement("div");
        bubble.className = "reaction-bubble";
        if (userReaction === type) bubble.classList.add("active");
        
        bubble.innerHTML = `<span class="emoji">${emoji}</span><span class="count" id="${type}-count-${messageId}">${count || 0}</span>`;
        
        if (!disabled) {
            bubble.style.cursor = "pointer";
            bubble.onclick = () => this.sendReaction(messageId, type, userReaction);
        } else {
            bubble.style.opacity = "0.6";
        }
        return bubble;
    }

    async sendReaction(messageId, reactionType, currentReaction) {
        const reactionToSend = (reactionType === currentReaction) ? null : reactionType;
        try {
            await fetch("https://echo-solo-backend.onrender.com/react", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: this.username, message_id: messageId, reaction: reactionToSend })
            });
            setTimeout(() => this.fetchAndDisplayMessages(), 500);
        } catch (error) {
            console.error("Error sending reaction:", error);
        }
    }

    startPolling() {
        this.fetchAndDisplayMessages();
        setInterval(() => this.fetchAndDisplayMessages(), 3000);
    }

    formatMarkdownBold(text) {
        return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    }

    getColorForUsername(username) {
        let hash = 0;
        for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
        return `hsl(${Math.abs(hash) % 360}, 60%, 40%)`;
    }
}

// Initialize the app when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    window.echoChat = new ChatRoom();
});
