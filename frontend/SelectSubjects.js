const topics = [
  {
    title: "הרפורמה המשפטית",
    description: "האם ואיך יש לאזן בין הרשויות בישראל?",
    color: '#b13342' ,
    icon: "scale",
    id: "Legal_reform"
  },
  {
    
    title:"בחירות לכנסת 2026",
    description: "מה הדרך הנכונה להתמודד עם המצב?",
    icon: "target",
    color: '#4A90E2' ,
    id: "Elections_2026"
  },
  {
    title: "חוק הגיוס",
    description: "שוויון בנטל או זכויות קהילתיות?",
    icon: "shield",
    color: '#5b8a72' ,
    id: "Recruitment_law"
  },
  {
    title: "משפט נתניהו",
    description: "האם יש כאן רדיפה פוליטית או צדק?",
    icon: "gavel",
    color: '#F5A623' ,
    id: "Bibi_trial"
  }
];

const container = document.getElementById("topics-container");

topics.forEach(topic => {
  const card = document.createElement("div");
  card.className = "rounded-2xl overflow-hidden shadow hover:shadow-lg bg-white transition-all flex flex-col p-6";

  card.innerHTML = `
    <div class="flex flex-col items-center text-center mb-4">
      <div class="bg-gray-100 text-indigo-600 rounded-full p-4 mb-3">
        <i data-lucide="${topic.icon}" class="w-8 h-8" style="color: ${topic.color};"></i>
      </div>
      <h3 class="text-xl font-semibold mb-1">${topic.title}</h3>
      <p class="text-gray-600 text-sm">${topic.description}</p>
    </div>
    <button class="mt-auto flex items-center justify-center w-full text-white py-2 rounded-lg gap-2 transition-all"
            style="background-color: ${topic.color};" 
            onclick="goToTopic('${topic.id}')">
      <svg class="lucide lucide-arrow-left h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M19 12H5m7-7-7 7 7 7"/>
      </svg>
      הצטרפו לדיון
    </button>
  `;
  container.appendChild(card);
});

lucide.createIcons();

// Unified routing function
function goToTopic(topicId) {
  window.location.href = `chat.html?topic=${topicId}`;
}

const nickname = localStorage.getItem("nickname");
document.getElementById("nickname").innerText = nickname ? nickname + "!" : "אורח!";