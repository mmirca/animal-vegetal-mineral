//
// App data - no modificar
//
const inquirer = require("inquirer");
const fs = require("fs");
let contents = fs.readFileSync("database.json");
let database = JSON.parse(contents);
let categoria = database.vegetal;
let nombreCategoria;
let trialsCount = 0;
let userName = "user";

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
  .then(userInput => {
    userName = userInput.userName;
    categoria = database[userInput.category];
    nombreCategoria = userInput.category;
    realizaPreguntas();
  });

//
// App Functions
//
function realizaPreguntas() {
  // Seleccion de preguntas aleatorias y construccion del array para inquirer
  let questionsIndex = getRandomNumbers(categoria.preguntas.length, numeroDePreguntas);
  let a_prompt = [];
  questionsIndex.forEach(index => {
    a_prompt.push({
      message: categoria.preguntas[index],
      type: "confirm",
      name: `q${index}`
    });
  });
  // Preguntas al usuario
  inquirer.prompt(a_prompt)
    .then((userInput) => {
      // Creacion del patrón de búsqueda (x: indefinidp, 0: no, 1: si)
      let searchPattern = "x".repeat(categoria.preguntas.length);
      for( key in userInput ){
        let questionIndex = parseInt(key.substring(1));
        if (userInput[key] === true) {
          searchPattern = setCharAt(searchPattern, questionIndex, "1");
        } else {
          searchPattern = setCharAt(searchPattern, questionIndex, "0");
        }
      }
      // Busqueda y comprobación de resultados coincidentes
      let a_matches = getMatches(searchPattern, categoria.respuestas);
      checkIfCorrect(searchPattern, a_matches);
    });
}

function getMatches(searchPattern, respuestas) {
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
      }else{
        // Coincide
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

function checkIfCorrect(searchPattern, a_matches) {
  if (a_matches[0] === undefined || trialsCount >= maxAmountOfTrials) {
    // No hay coincidencias o se ha superado el número de intentos
    addNewAnswer(searchPattern, userName, categoria);
    return;
  }
  inquirer.prompt([{
    message: `¿Estas pensando en ${a_matches[0].name}?`,
    type: "confirm",
    name: "isCorrect"
  }])
    .then(userInput => {
      if (userInput.isCorrect === true) {
        // Respuesta correcta, se mejora su patrón con el input del usuario
        let oldPattern = categoria.respuestas[a_matches[0].name].pattern;
        let improvedPattern = mixPatterns(oldPattern, searchPattern);
        categoria.respuestas[a_matches[0].name].pattern = improvedPattern;
        fs.writeFileSync('database.json', JSON.stringify(database));
        console.log(`¡He acertado! Lo sé gracias a ${a_matches[0].author}`);
        console.log(`¡Tengo registrados ${Object.keys(categoria.respuestas).length} ${nombreCategoria}es!`);
      } else {
        // Respuesta incorrecta, elimina el match y prueba de nuevo
        trialsCount++;
        a_matches.splice(0, 1);
        checkIfCorrect(searchPattern, a_matches);
      }
    });
}

function addNewAnswer(currentPattern, username, categoria) {
  inquirer.prompt([
    {
      message: `Me rindo, ¿En que estabas pensando?`,
      type: "input",
      name: "name"
    },
    {
      message: `Introduce una pregunta cuya respuesta sea "si" que lo diferencie`,
      type: "input",
      name: "question"
    }
  ])
    .then(userInput => {
      // Actualiza el resto de respuestas
      for(key in categoria.respuestas){
        categoria.respuestas[key].pattern = categoria.respuestas[key].pattern + "x";
      }
      // Añadir una nueva respuesta
      if(categoria.respuestas[userInput.name] === undefined){
        // El registro no existe, se crea uno nuevo
        categoria.preguntas.push(userInput.question);
        categoria.respuestas[userInput.name] = {
          author: username,
          pattern: currentPattern + "1"
        }
      }else{
        // El registro existe, se actualiza con los datos del formulario y una nueva pregunta
        let oldPattern = categoria.respuestas[userInput.name].pattern;
        categoria.preguntas.push(userInput.question);
        categoria.respuestas[userInput.name] = {
          author: username,
          pattern: mixPatterns(oldPattern, currentPattern + "1")
        }
      }
      // Guardar los cambios en el JSON
      fs.writeFileSync('database.json', JSON.stringify(database));
      console.log("Gracias por ayudarme a aprender");
      console.log(`¡Ya tengo registrados ${Object.keys(categoria.respuestas).length} ${nombreCategoria}es!`);
    });
}
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

//
// Helper functions
//
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