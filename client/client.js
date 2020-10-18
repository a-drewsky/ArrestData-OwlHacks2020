let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");

canvas.width = innerWidth - 25;
canvas.height = innerHeight * 0.8;

let settings = {
    populationCount: 1000,
    jailPersonSize: {
        x: 10,
        y: 20
    },
    buffer: 20,
    startDate: new Date('2020-01-01'),
    bottomPos: canvas.height - 50,
    bottomBuffer: 10,
    barSpacing: 40,
    dayDelimiter: 10,
    loopTime: 400,
    minimumPersonSize: {
        x: Math.floor(canvas.width/600),
        y: Math.floor(canvas.width/300)
    }
}


settings.personSize = {
    x: 6000 / settings.populationCount,
    y: 12000 / settings.populationCount
}

let day = 0;
let time = 0;

let population = {};
let families = {};
let records = [];
let recordsToUse = [];
let init;

let cityImg = new Image();
cityImg.src = "./client/img/city.png"

let houseImgs = [];

for(let i=1; i<=6; i++){
    houseImgs[i] = new Image();
    houseImgs[i].src = "./client/img/house-" + i + ".png";
}


function restartSimulation() {

    clearInterval(init);
    let populationNum = document.getElementById("txtPopulation").value;

    if (populationNum == "" || populationNum < 200 || populationNum > 4000) {
        populationNum = 1000;
    }

    settings.populationCount = populationNum;
    day = 0;
    time = 0;
    population = {};
    families = {};
    records = [];
    recordsToUse = [];
    loadData();

    settings.personSize = {
        x: 6000 / settings.populationCount,
        y: 12000 / settings.populationCount
    }

    if(settings.personSize.x<settings.minimumPersonSize.x || settings.personSize.y<settings.minimumPersonSize.y){
        settings.personSize.x = settings.minimumPersonSize.x;
        settings.personSize.y = settings.minimumPersonSize.y;
    }

    populate();
    

}

function setStartDate() {
    let startDay = 400;

    for (let i = 0; i < recordsToUse.length; i++) {
        if (recordsToUse[i].arrestDay < startDay) startDay = recordsToUse[i].arrestDay;
    }

    day = startDay - 30;

    if (day < 0) day = 0;


}

function update() {

    time++;

    if (time % settings.dayDelimiter == 0) day++;


    //arrestees affect family
    //based on days arrested
    //if days after arrest is less than 100, influence += 100 - (days after arrest/20) 

    //everyone affects friends
    //half of influence level

    for (let i in population) {

        //increment position
        if (population[i].delay <= 0) {
            if (population[i].influence == 0) population[i].position++;
            else {
                let increment = map(population[i].influence, 0, 100, 1, 0.2);
                if (increment > 1) increment = 1;
                population[i].position += increment;
            }
            if (population[i].position >= settings.loopTime) population[i].position = 0;
        } else {
            population[i].delay--;
        }


        //family influence
        if (population[i].arrested) {
            let arrestee = population[i];
            if (arrestee.daysSinceArrest < 100) {
                arrestee.daysSinceArrest++;
                let family = families[arrestee.family];
                for (let j = 0; j < family.members.length; j++) {
                    let person = population[family.members[j]];
                    if (person != arrestee) {
                        person.influence += (100 - arrestee.daysSinceArrest) / 100;
                    }
                }
            }

        }

        //friend influence
        if (population[i].influence > 0) {
            let influencer = population[i]
            for (let j = 0; j < population[i].friends.length; j++) {
                let friend = population[population[i].friends[j]];
                if (friend.influence < influencer.influence / 2) {
                    friend.influence = influencer.influence / 2;
                }
            }
        }

    }

    for (let i = 0; i < recordsToUse.length; i++) {
        if (time % settings.dayDelimiter == 0 && day == recordsToUse[i].arrestDay) {
            let arrestee = getRandomPerson();
            arrestee.arrested = true;
            arrestee.influence = 100;

        }
    }

    draw();
}

function draw() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);


    ctx.globalAlpha = 0.4;

    //draw images
    for(let i=0; i<canvas.width; i+=300){
        ctx.drawImage(cityImg, i, -20, 300, 100);
    }

    for(let i=0; i<canvas.width; i+=80){
        ctx.drawImage(houseImgs[(i/80)%6+1], i, settings.bottomPos-55, 80, 60);
    }

    
    ctx.globalAlpha = 1;

    let inJail = 0;

    //draw population
    for (let i in population) {
        if (!population[i].arrested) {
            let position = Math.floor(population[i].position);

            let totalDistance = settings.bottomPos - settings.bottomBuffer*6 - settings.personSize.y;

            if (position < settings.loopTime * 0.1) {
                drawPerson(population[i].xPosition, settings.bottomPos - settings.personSize.y, population[i].influence, false);
            } else if (position < settings.loopTime * 0.5) {
                let distance = (settings.loopTime * 0.4) / (population[i].position - settings.loopTime * 0.1);
                drawPerson(population[i].xPosition, settings.bottomPos - totalDistance / distance - settings.personSize.y, population[i].influence, false);
            } else if (position < settings.loopTime * 0.6) {
                drawPerson(population[i].xPosition, settings.bottomBuffer*6, population[i].influence, false);
            } else {
                let distance = (settings.loopTime * 0.4) / (population[i].position - settings.loopTime * 0.6);
                drawPerson(population[i].xPosition, settings.bottomBuffer*6 + totalDistance / distance - settings.personSize.y + settings.personSize.y, population[i].influence, false);
            }


        }
        else {
            drawPerson(settings.bottomBuffer + settings.barSpacing * inJail + (settings.barSpacing - settings.jailPersonSize.x) / 2, settings.bottomPos + settings.bottomBuffer - (settings.jailPersonSize.y - (canvas.height - settings.bottomBuffer - settings.bottomPos)) / 2, population[i].influence, true);
            inJail++;
        }
    }
    drawJail();
}

function drawPerson(x, y, influence, jailed) {

    let personSize;

    if (jailed) {
        personSize = {
            x: settings.jailPersonSize.x,
            y: settings.jailPersonSize.y
        }
    } else {
        personSize = {
            x: settings.personSize.x,
            y: settings.personSize.y
        }
    }

    let headSize = {
        x: personSize.x / 2,
        y: personSize.y / 4
    }
    let bodySize = {
        x: personSize.x,
        y: personSize.y * 0.8
    }

    let colorLevel = map(influence, 0, 100, 0, 255);

    ctx.fillStyle = 'rgb(' + colorLevel + ',0,0)';

    ctx.beginPath();
    ctx.ellipse(x + personSize.x / 2, y + personSize.y / 8, headSize.x / 2, headSize.y / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(x + personSize.x / 2, y + personSize.y / 5 + (personSize.y * 0.75) / 2, bodySize.x / 2, bodySize.y / 2, 0, 0, Math.PI * 2);
    ctx.fill();

}

function drawJail() {
    ctx.fillStyle = 'black';
    ctx.strokeRect(settings.bottomBuffer, settings.bottomPos + settings.bottomBuffer, canvas.width - settings.bottomBuffer * 2, canvas.height - settings.bottomPos - settings.bottomBuffer * 2);
    ctx.lineWidth = 5;
    for (let i = settings.bottomBuffer + settings.barSpacing; i < canvas.width - settings.bottomBuffer; i += settings.barSpacing) {
        ctx.beginPath();
        ctx.moveTo(i, settings.bottomPos + settings.bottomBuffer);
        ctx.lineTo(i, canvas.height - settings.bottomBuffer);
        ctx.stroke();
    }
    ctx.lineWidth = 1;
}



function populate() {
    for (let i = 0; i < settings.populationCount; i++) {
        let newPersonid = uuid();
        let newPerson = {
            arrested: false,
            daysSinceArrest: 0,
            family: null,
            friends: [],
            influence: 0,
            position: 0,
            xPosition: canvas.width / settings.populationCount * i,
            delay: Math.floor(Math.random() * (settings.loopTime / 2))
        }
        if (families.length == 0) {
            let newFamily = {
                size: null,
                count: 0,
                members: []
            }
            let id = uuid();
            newFamily.size = 1;
            newFamily.count++;
            families[id] = newFamily;
            newPerson.family = id;
            newFamily.members.push(newPersonid);
        } else {
            for (let j in families) {
                if (families[j].count < families[j].size) {
                    families[j].count++;
                    newPerson.family = j;
                    families[j].members.push(newPersonid);
                    break;
                }
            }
            if (newPerson.family == null) {
                let newFamily = {
                    size: null,
                    count: 0,
                    members: []
                }
                let id = uuid();
                newFamily.size = Math.min(Math.ceil(randn_bm() * 5.2), Object.keys(families).length);
                if (newFamily.size == 0) newFamily.size = 1;
                newFamily.count++;
                families[id] = newFamily;
                newPerson.family = id;
                newFamily.members.push(newPersonid);
            }
        }


        population[newPersonid] = newPerson;
    }

    for (let i in population) {
        let person = population[i];

        let numFriends = Math.ceil(randn_bm() * 10);

        for (let j = 0; j < numFriends; j++) {
            let friendId = getRandomPersonID();
            if (friendId != i) {
                let add = true;
                for (let l = 0; l < person.friends.length; l++) {
                    if (person.friends[l] == population[friendId]) {
                        add = false;
                    }
                }
                if (add == true) {
                    person.friends.push(friendId);
                }
            }

        }
    }
}

function getRandomPerson() {
    let keys = Object.keys(population);
    return population[keys[keys.length * Math.random() << 0]];
}

function getRandomPersonID() {
    let keys = Object.keys(population);
    return keys[keys.length * Math.random() << 0];
}

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function randn_bm() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while (v === 0) v = Math.random();
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    num = num / 10.0 + 0.5; // Translate to 0 -> 1
    if (num > 1 || num < 0) return randn_bm(); // resample between 0 and 1
    return num;
}

function dateDiffInDays(date1, date2) {
    // round to the nearest whole number
    return Math.round((date2 - date1) / (1000 * 60 * 60 * 24));
}

function map(num, in_min, in_max, out_min, out_max) {
    return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

populate();


$(document).ready(function () {
    loadData();
});

function loadData() {

    document.getElementById("btnRestart").addEventListener("click", restartSimulation);

    $.ajax({
        type: "GET",
        url: "client/all.csv",
        dataType: "text",
        success: function (data) { processData(data); },
        error: function (xhr, ajaxOptions, thrownError) {
            alert("Status: " + xhr.status + "     Error: " + thrownError);
        }
    });
}


function processData(data) {
    let allText = data.split(/\r\n|\n/);
    for (let i = 1; i < allText.length - 1; i++) {



        let line = allText[i].split(',');
        let arrest = line[3].split('/');
        let arrestDate = new Date(arrest[2] + "/" + arrest[0] + "/" + arrest[1]);
        let bail = line[10] != 0;
        let paid = line[11] != 0;

        if (bail && !paid && arrestDate > settings.startDate) {

            let newRecord = {
                id: uuid(),
                arrestDay: dateDiffInDays(settings.startDate, arrestDate)
            }

            records.push(newRecord);

        }



    }


    let numRecordsToUse = settings.populationCount / 100;

    for (let i = 0; i < numRecordsToUse; i++) {
        let record = records[Math.floor(Math.random() * records.length)];

        recordsToUse.push(record);

        records.splice(records.indexOf(record), 1);

    }

    setStartDate();
    init = setInterval(update, 1000 / 30);

}

