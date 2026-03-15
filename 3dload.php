<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
    <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />

        <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
        <title>NFTDrive-3DAssetPreView</title>
        <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script>
      

    </head>
   <body>

<style>
        #WebGL-output{
            width: 100vw;
            height: 100vh;
        }

        .material-symbols-outlined {
        font-variation-settings:
        'FILL' 0,
        'wght' 400,
        'GRAD' 0,
        'opsz' 24
      }

        html{
            overflow: hidden;
        }
        body{
            margin: 0px;
            background: #00000000;


        }

        #anime{
        position: absolute;
        top:0px;
        right:5px;
        background: #ee82ee00;
        border-radius: 20px;
        }

        #custom-ar-button{

        position: absolute;
        top:25px;
        right:5px;
        background: #ee82ee00;
        border-radius: 120px;
        }
    </style>


    <!-- <canvas id="renderCanvas" touch-action="none"></canvas> touch-action="none" for best results from PEP -->
 
<!-- Output -->
<div style="position:absolute">
  <img src="image/360.svg"  width="60px" alt="">  
</div>

<div id="WebGL-output">


<model-viewer 
 alt="3D"
 src="download.php?address=" 
 ar 
 shadow-intensity="1" 
 camera-controls touch-action="pan-y"
 style="width:100%;height:95%;"
 autoplay
 loading="eager"
 >

 <button id="custom-ar-button" slot="ar-button">
  <span class="material-symbols-outlined">
view_in_ar
</span>
</button>
 <select style="display:none;" name="" id="anime"></select>
</model-viewer>

</div>
 


<script> 

try {
  
  document.querySelector("#model-viewer").addEventListener('ar-status', (event) => {



    if(event.detail.status === 'failed'){
      const error = document.querySelector("#error");
      error.classList.remove('hide');
      error.addEventListener('transitionend',(event) => {
        error.classList.add('hide');
      });
    }
  });

  document.querySelector("#model-viewer").addEventListener('progress', (event) => {


    console.log('進捗状況', event.detail.totalProgress);


  })


} catch (error) {
  

  // location.reload();
}


const modelViewer = document.querySelector("model-viewer");
modelViewer.addEventListener('load', (event) => {

  console.log(modelViewer.availableAnimations)

  if(modelViewer.availableAnimations.length!=0){

    document.getElementById("anime").style.display="block";

    for (let index = 0; index < modelViewer.availableAnimations.length; index++) {
      const element = modelViewer.availableAnimations[index];

      document.getElementById("anime").innerHTML+="<option value="+element+">"+element+"</option>";


    }
    
    document.getElementById("anime").addEventListener("change",d=>{

      // console.log(d);

      modelViewer.setAttribute("animation-name",d.target.value);
      


    })

    
  }




});


</script>

 








   </body>
</html>