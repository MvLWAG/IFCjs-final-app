const uiToggle = document.getElementById("themetoggle");
uiToggle.onclick = function () {
  toggleUI();   
};

const modellist = document.getElementById("model-list");
const models = Array.from(modellist.children);
console.log(models);

const url = "./index.html";

for (let i = 0; i < models.length-1; i++) {
    models[i].href = url + `?id=${i}`;
}

function toggleUI(){
    console.log("toggleUI");
    const body = document.body;
    const dark = body.classList.contains('darkTheme');
    const uiToggle = document.getElementById("themetoggle");
    if(dark){
        body.classList.add("lightTheme")
        body.classList.remove('darkTheme');
        uiToggle.innerHTML = "🌞";
        uiToggle.title = "Switch to dark mode";     
    }
    else{    
        body.classList.add('darkTheme');
        body.classList.remove("lightTheme")
        uiToggle.innerHTML = "🌛";
        uiToggle.title = "Switch to light mode";        
    }
}