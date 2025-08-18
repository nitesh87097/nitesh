let sentimentChart, favorites = JSON.parse(localStorage.getItem("favorites")) || [];
let currentPage = 1, lastQuery = "technology";

const darkModeToggle = document.getElementById("darkModeToggle");
darkModeToggle.addEventListener("change", ()=> document.body.classList.toggle("dark", darkModeToggle.checked));

function showLoading(show){
    const loading = document.getElementById("loading");
    const container = document.getElementById("newsContainer");
    if(show){
        loading.classList.remove("d-none");
        container.innerHTML = '<div class="skeleton"></div>'.repeat(4);
    } else loading.classList.add("d-none");
}

function showAlert(msg){ const alertBox = document.getElementById("alertBox"); alertBox.textContent=msg; alertBox.classList.remove("d-none"); setTimeout(()=>alertBox.classList.add("d-none"),4000); }

function getCategoryIcon(category){
    switch(category?.toLowerCase()){
        case "technology": return "💻";
        case "sports": return "⚽";
        case "entertainment": return "🎬";
        case "business": return "💼";
        default: return "📰";
    }
}

function fetchNews(query="technology", page=1){
    const lang = document.getElementById("language").value;
    query = query.trim() || "technology";
    lastQuery = query;
    currentPage = page;
    showLoading(true);
    fetch(`/get_news?query=${encodeURIComponent(query)}&language=${lang}&page=${page}`)
        .then(res=>res.json())
        .then(data=>{ if(data.error) showAlert(`⚠️ ${data.message}`); else renderNews(data.items); })
        .catch(()=>showAlert("⚠️ Failed to fetch news!"))
        .finally(()=>showLoading(false));
}

function renderNews(newsList){
    const container=document.getElementById("newsContainer"); container.innerHTML="";
    if(!newsList || !newsList.length){ container.innerHTML="<p>No news found.</p>"; updateChart(0,0,0); return; }
    let pos=0,neu=0,neg=0;
    newsList.forEach(news=>{
        const sentiment=news.sentiment.toLowerCase();
        if(sentiment==="positive") pos++; else if(sentiment==="negative") neg++; else neu++;
        const card=document.createElement("div"); card.className="col-md-6";
        card.innerHTML=`
        <div class="card h-100 shadow-sm news-card">
          ${news.image? `<img src="${news.image}" class="card-img-top" alt="News Image">`:""}
          <div class="card-body d-flex flex-column">
            <span class="category-badge ${news.category?.toLowerCase() || "default"}">${getCategoryIcon(news.category)} ${news.category || "General"}</span>
            <h5 class="card-title">${news.title}</h5>
            <p class="card-text">${news.summary || news.description}</p>
            <p class="text-muted" style="font-size:0.85rem;">🕒 ${new Date(news.publishedAt).toLocaleString()}</p>
            <p><span class="badge bg-${sentiment==="positive"?"success":sentiment==="negative"?"danger":"secondary"}">${news.sentiment}</span></p>
            <a href="${news.url}" target="_blank" class="btn btn-sm btn-primary mt-auto" title="Read More">📖 Read More</a>
            <button class="btn btn-sm btn-outline-warning mt-2 fav-btn" title="Add to Favorites">⭐ Favorite</button>
            <button class="btn btn-sm btn-outline-info mt-2 speak-btn" title="Listen News">🔊 Listen</button>
          </div>
        </div>`;
        card.querySelector(".fav-btn").addEventListener("click",()=>addFavorite(news));
        card.querySelector(".speak-btn").addEventListener("click",()=>speak(news.summary || news.description));
        container.appendChild(card);
    });
    updateChart(pos,neu,neg);
}

function updateChart(pos,neu,neg){
    const ctx = document.getElementById("sentimentChart").getContext("2d");
    if(sentimentChart) sentimentChart.destroy();
    sentimentChart=new Chart(ctx,{type:"pie",data:{labels:["Positive 😀","Neutral 😐","Negative 😞"],datasets:[{data:[pos,neu,neg],backgroundColor:["#28a745","#6c757d","#dc3545"]}] } });
}

function addFavorite(news){
    if(favorites.some(f=>f.url===news.url)) return;
    favorites.push(news);
    localStorage.setItem("favorites",JSON.stringify(favorites));
    renderFavorites();
}

function renderFavorites(){
    const container=document.getElementById("favoritesContainer"); container.innerHTML="";
    favorites.forEach(news=>{
        const div=document.createElement("div");
        div.className="p-2 border rounded d-flex flex-column gap-1";
        div.innerHTML=`<span>${news.title.slice(0,40)}...</span><img src="${news.image||'fallback.jpg'}" style="max-height:100px;object-fit:cover;width:100%;"><span class="badge bg-${news.sentiment==="positive"?"success":news.sentiment==="negative"?"danger":"secondary"}">${news.sentiment}</span><button class="btn btn-sm btn-danger">Remove</button>`;
        div.querySelector("button").addEventListener("click",()=>{
            favorites=favorites.filter(f=>f.url!==news.url);
            localStorage.setItem("favorites",JSON.stringify(favorites));
            renderFavorites();
        });
        container.appendChild(div);
    });
}

function speak(text){ const utter=new SpeechSynthesisUtterance(text); speechSynthesis.speak(utter); }

function addSearchHistory(query){
    let history=JSON.parse(localStorage.getItem("searchHistory"))||[];
    if(!history.includes(query)) history.push(query);
    localStorage.setItem("searchHistory",JSON.stringify(history));
    renderSearchHistory();
}

function renderSearchHistory(){
    const history = JSON.parse(localStorage.getItem("searchHistory")) || [];
    const container = document.getElementById("searchHistory");
    container.innerHTML = "";

    history.slice(-5).reverse().forEach(h => {
        const wrapper = document.createElement("span");
        wrapper.style.marginRight = "5px";

        const btn = document.createElement("button");
        btn.className = "btn btn-sm btn-outline-secondary";
        btn.textContent = h;
        btn.addEventListener("click", () => fetchNews(h));

        const del = document.createElement("button");
        del.className = "btn btn-sm btn-outline-danger ms-1";
        del.textContent = "×";
        del.addEventListener("click", () => {
            const newHistory = history.filter(item => item !== h);
            localStorage.setItem("searchHistory", JSON.stringify(newHistory));
            renderSearchHistory();
        });

        wrapper.appendChild(btn);
        wrapper.appendChild(del);
        container.appendChild(wrapper);
    });
}

document.getElementById("searchBtn").addEventListener("click",()=>{
    const query=document.getElementById("searchBox").value;
    if(query) fetchNews(query,1); addSearchHistory(query);
});

document.querySelectorAll(".category-carousel button").forEach(btn=>{
    btn.addEventListener("click",()=>{ const cat=btn.textContent.replace(/[^a-zA-Z ]/g,"").trim(); fetchNews(cat,1); });
});

document.addEventListener("DOMContentLoaded",()=>{
    renderFavorites(); renderSearchHistory(); fetchNews();
});

const observer=new IntersectionObserver(entries=>{
    if(entries[0].isIntersecting){ currentPage++; fetchNews(lastQuery,currentPage); }
},{ threshold:1 });

const anchor=document.createElement("div"); anchor.id="scroll-anchor";
document.getElementById("newsContainer").after(anchor); observer.observe(anchor);
// Smooth Scroll for Category Carousel Buttons
document.querySelectorAll(".category-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        fetchNews(btn.dataset.category);
        addSearchHistory(btn.dataset.category);
        // Scroll top smoothly after fetching
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});
// ------------------- Voice Search (Last in script.js) -------------------
const voiceBtn = document.getElementById("voiceBtn");
if ('webkitSpeechRecognition' in window) {
    const recognition = new webkitSpeechRecognition();
    recognition.lang = document.getElementById("language").value || "en";
    recognition.continuous = false;
    recognition.interimResults = false;

    voiceBtn.addEventListener("click", () => {
        recognition.start();
    });

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById("searchBox").value = transcript;
        fetchNews(transcript);
        addSearchHistory(transcript);
    };

    recognition.onerror = (event) => {
        console.error("Voice recognition error", event);
    };
} else {
    voiceBtn.disabled = true;
    voiceBtn.title = "Speech recognition not supported";
}
// -----------------------------------------------------------------------
