export let preloadDivs = document.getElementsByClassName("preload");
export let preloadOpacity = document.getElementsByClassName("preload-overlay");
export let postloadDivs = document.getElementsByClassName("postload");
export let startScreenDivs = document.getElementsByClassName("start-screen");
export let startButton = document.getElementById("start-button");
export let fadeOutDivs = document.getElementsByClassName("fadeOutDiv");

// 如果浏览器不支持webgl
export function noWebGL() {
  for (let i = 0; i < preloadDivs.length; i++) {
    preloadDivs[i].style.visibility = "hidden";
    preloadDivs[i].style.display = "none";
  }
  for (let i = 0; i < postloadDivs.length; i++) {
    postloadDivs[i].style.display = "none";
  }
  for (let i = 0; i < preloadOpacity.length; i++) {
    preloadOpacity[i].style.display = "none";
  }

  var warning = WEBGL.getWebGLErrorMessage();
  var a = document.createElement("a");
  var linkText = document.createTextNode("Click here to visit my static site");
  a.appendChild(linkText);
  a.title = "Static Site";
  a.href = "https://kurumiku0712.github.io/Personal-Portfolio/"; 
  a.style.margin = "0px auto";
  a.style.textAlign = "center";
  document.getElementById("WEBGLcontainer").appendChild(warning);
  document.getElementById("WEBGLcontainer").appendChild(a);
}
