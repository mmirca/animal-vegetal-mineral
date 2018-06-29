//
// App data - no modificar
//
const inquirer = require("inquirer");
const fs = require("fs");

const g_dbPath = "database.json";
let g_database = JSON.parse(fs.readFileSync(g_dbPath));
let g_categoria;
let g_categoryName;
let g_userName;
let g_searchPattern;

//
// Config - Variables ajustables
//
let numeroDePreguntas = 3;
let maxAmountOfTrials = 2;

//
// Init
//
inquirer.prompt([
  {
    message: "¿Cuál es tu nombre?",
    type: "input",
    name: "userName"
  },
  {
    message: "¿En qué categoria quieres jugar?",
    type: "list",
    choices: ["animal", "vegetal", "mineral"],
    name: "category"
  }
])
.then( userInput => {

  g_userName = userInput.userName;
  g_categoria = g_database[userInput.category];
  g_categoryName = userInput.category;
  return askRandomQuestions(g_categoria);

})
.then( answers => {
  
  g_searchPattern = buildSearchPattern(answers, g_categoria);
  let a_matches = getMatches(g_searchPattern, g_categoria);
  return checkMatchesWithUser(a_matches, 0);

})
.then( win => {
  
  if(win){
    
    console.log(`¡He acertado! Lo sé gracias a ${win.author}`);
    return winGame(win.name);    
    
  }else{
    
    console.log("Me rindo! No consigo adivinar lo que tu mente es capaz de imaginar");
    return loseGame();

  }

})
.then((win)=>{

  saveData(win, g_dbPath, g_database);
  console.log(`¡Tengo registrados ${Object.keys(g_categoria.respuestas).length} ${g_categoryName}es!`);

});

//
// App Functions
//
function saveData(win){

  fs.writeFileSync(g_dbPath, JSON.stringify(g_database));

  if(win)
    console.log("Gracias por jugar!");
  else
    console.log(`Gracias por ayudarme a aprender ${g_userName}`);

}
function winGame(itemName){

  // Respuesta correcta, se mejora su pattern con el input del usuario
  let oldPattern = g_categoria.respuestas[itemName].pattern;
  let improvedPattern = mixPatterns(oldPattern, g_searchPattern);
  g_categoria.respuestas[itemName].pattern = improvedPattern;  

  return new Promise((resolve, reject)=>{
    resolve(true);
  });

}

async function checkMatchesWithUser(a_matches, count){  

  if( a_matches.length === 0 || count >= maxAmountOfTrials ){
    return new Promise((resolve, reject)=>{
      resolve(false);
    });
  }

  let userInput = await inquirer.prompt([{
    message: `¿Estas pensando en ${a_matches[0].name}?`,
    type: "confirm",
    name: "isCorrect"
  }])

  count++;

  if (userInput.isCorrect === true) {
    return new Promise((resolve, reject)=>{
      resolve(a_matches[0]);
    });
  }

  // Respuesta incorrecta, elimina el match y prueba de nuevo
  a_matches.splice(0, 1);
  return checkMatchesWithUser(a_matches, count);
  
};

async function askRandomQuestions(category){

  let questionsIndex = getRandomNumbers(category.preguntas.length, numeroDePreguntas);
  let a_questions = [];

  questionsIndex.forEach(index => {
    a_questions.push({
      message: category.preguntas[index],
      type: "confirm",
      name: `q${index}`
    });
  });

  return await inquirer.prompt(a_questions);

}

function buildSearchPattern(answers, category) {

  // Creacion del patrón de búsqueda (x: indefinidp, 0: no, 1: si)
  let searchPattern = "x".repeat(category.preguntas.length);

  for( key in answers ){
    let questionIndex = parseInt(key.substring(1));
    if (answers[key] === true) {
      searchPattern = setCharAt(searchPattern, questionIndex, "1");
    } else {
      searchPattern = setCharAt(searchPattern, questionIndex, "0");
    }
  }

  return searchPattern;

}

function getMatches(searchPattern, category) {

  let respuestas = category.respuestas;
  let a_matches = [];

  for (key in respuestas) {

    let accuracy = 0;
    let itemMatchesPattern = true;

    for(let i = 0; i < searchPattern.length; i++){

      if(respuestas[key].pattern[i] === "x" || searchPattern[i] === "x"){
        // No se puede determinar
        continue;
      }
      if(searchPattern[i] !== respuestas[key].pattern[i]){
        // Descartado"
        itemMatchesPattern = false;
      }else if(searchPattern[i] == "1"){
        // Coincide con "si" - mas puntos porque hay preguntas especificas para un elemento
        accuracy = accuracy + 2;
      }else{
        // Coincide con "no"
        accuracy++;
      }

    }

    if(itemMatchesPattern === true){

      a_matches.push({
        name: key,
        author: respuestas[key].author,
        accuracy: accuracy
      });

    }

  }

  a_matches.sort((a, b) => b.accuracy - a.accuracy);
  return a_matches;

}

async function loseGame() {
  
  let userInput = await inquirer.prompt([
    {
      message: `¿En que estabas pensando?`,
      type: "input",
      name: "name"
    },
    {
      message: `Introduce una pregunta cuya respuesta sea "si" que lo diferencie`,
      type: "input",
      name: "question"
    }
  ])

  // Añade una x de indefinido a las respuestas existentes por la nueva pregunta
  // que vamos a añadir
  for(key in g_categoria.respuestas){
    g_categoria.respuestas[key].pattern = g_categoria.respuestas[key].pattern + "x";
  }
  g_categoria.preguntas.push(userInput.question);

  // Añadir una nueva respuesta a la categoria
  if(g_categoria.respuestas[userInput.name] === undefined){

    // El registro no existe, se crea uno nuevo
    g_categoria.respuestas[userInput.name] = {
      author: g_userName,
      pattern: g_searchPattern + "1"
    }

  }else{

    // El registro existe, se actualiza con los datos del formulario
    let oldPattern = g_categoria.respuestas[userInput.name].pattern;
    g_categoria.respuestas[userInput.name] = {
      author: g_userName,
      pattern: mixPatterns(oldPattern, g_searchPattern + "1")
    }

  }

  return new Promise((resolve, reject)=>{
    resolve(false);
  });
      
}

//
// Helper functions
//
function mixPatterns(oldPattern, newPattern){

  // El nuevo patrón sobreescribe el anterior
  let mixedPattern = oldPattern;

  for(let i = 0; i < newPattern.length; i++){
    if(newPattern[i] !== "x"){
      mixedPattern = setCharAt(mixedPattern, i, newPattern[i]);
    }
  }

  return mixedPattern;

}

function getRandomNumbers(maxNumber, arrayLenght){

  let a_numbers = [];

  while(a_numbers.length < arrayLenght){
    let randomNumber = Math.floor(Math.random() * (maxNumber));
    if(a_numbers.indexOf(randomNumber) === -1){
      a_numbers.push(randomNumber);
    }
  }

  return a_numbers;

}

function setCharAt(str,index,chr) {

  if(index > str.length-1) return str;
  return str.substr(0,index) + chr + str.substr(index+1);

}