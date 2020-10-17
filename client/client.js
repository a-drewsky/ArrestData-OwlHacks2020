let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");

canvas.width = innerWidth;
canvas.height = innerHeight;

let settings = {
    populationCount: 100,
    personSize: {
        x: 20,
        y: 40
    },
    buffer: 20,
    startDate: new Date('2020-01-01')
}

let day = 0;

let population = {};
let families = {};
let records = [];
let recordsToUse = [];

let init = function () {
    setInterval(update, 1000 / 10);
}

function update(){

    day++;


    //arrestees affect family
        //based on days arrested
        //if days after arrest is less than 100, influence += 100 - (days after arrest/20) 



    //everyone affects friends
        //based on influence level

    for(let i in population){

        //family influence
        if(population[i].arrested){
            let arrestee = population[i];
            if(arrestee.daysSinceArrest<100){
                arrestee.daysSinceArrest++;
                let family = families[arrestee.family];
                for(let j=0; j<family.members.length; j++){
                    let person = population[family.members[j]];
                    if(person!=arrestee){
                        person.influence+= (100 - arrestee.daysSinceArrest)/100;
                    }
                }
            } 

        }

        //friend influence
        if(population[i].influence>0){
            let influencer = population[i]
            for(let j=0; j<population[i].friends.length; j++){
                let friend = population[population[i].friends[j]];
                if(friend.influence < influencer.influence/2){
                    friend.influence = influencer.influence/2;
                }
            }
        }

    }
    
    for(let i=0; i<recordsToUse.length; i++){
        if(day == recordsToUse[i].arrestDay){
            let arrestee = getRandomPerson();
            arrestee.arrested = true;
            arrestee.influence = 100;

        }
    }

    draw();
}

function draw(){

    let x = settings.buffer;
    let y = settings.buffer;

    for(let i in population){
        drawPerson(x, y, population[i].influence);
        x += settings.personSize.x + settings.buffer;

        if(x > canvas.width - settings.personSize.x - settings.buffer){
            x = settings.buffer;
            y += settings.personSize.y + settings.buffer;
        }
    }
}

function drawPerson(x, y, influence){
    let headSize = {
        x: settings.personSize.x/2,
        y: settings.personSize.y/4
    }
    let bodySize = {
        x: settings.personSize.x,
        y: settings.personSize.y*0.8
    }

    let colorLevel = map(influence, 0, 100, 0, 255);

    ctx.fillStyle = 'rgb(' + colorLevel + ',0,0)'; 

    ctx.beginPath();
    ctx.ellipse(x + settings.personSize.x/2, y + settings.personSize.y/8, headSize.x/2, headSize.y/2, 0, 0, Math.PI*2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(x + settings.personSize.x/2, y + settings.personSize.y/5 + (settings.personSize.y*0.75)/2, bodySize.x/2, bodySize.y/2, 0, 0, Math.PI*2);
    ctx.fill();

}



function populate() {
    for (let i = 0; i < settings.populationCount; i++) {
        let newPersonid = uuid();
        let newPerson = {
            arrested: false,
            daysSinceArrest: 0,
            family: null,
            friends: [],
            influence: 0
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
                if(newFamily.size==0) newFamily.size = 1;
                newFamily.count++;
                families[id] = newFamily;
                newPerson.family = id;
                newFamily.members.push(newPersonid);
            }
        }

        let numFriends = Math.ceil(randn_bm() * 10);

        for (let j = 0; j < numFriends; j++) {
            if(Object.keys(population).length>0){
                let friendId = getRandomPersonID();
                if (friendId != newPersonid) {
                    let add = true;
                    for (let l = 0; l < newPerson.friends.length; l++) {
                        if (newPerson.friends[l] == population[friendId]) {
                            add = false;
                        }
                    }
                    if (add == true) {
                        newPerson.friends.push(friendId);
                    }
                }
            }
            
        }
        population[newPersonid] = newPerson;
    }
    console.log(population);
}

function getRandomPerson(){
    let keys = Object.keys(population);
    return population[keys[ keys.length * Math.random() << 0]];
}

function getRandomPersonID(){
    let keys = Object.keys(population);
    return keys[ keys.length * Math.random() << 0];
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
    return Math.round((date2-date1)/(1000*60*60*24));
}

function map(num, in_min, in_max, out_min, out_max) {
    return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
  }

populate();

$(document).ready(function() {
    $.ajax({
        type: "GET",
        url: "client/all.csv",
        dataType: "text",
        success: function(data) {processData(data);},
        error: function(xhr, ajaxOptions, thrownError) {
            alert("Status: " + xhr.status + "     Error: " + thrownError);
        }
     });
});


function processData(data){
    let allText = data.split(/\r\n|\n/);
    for(let i=1; i<allText.length-1; i++){



        let line = allText[i].split(',');
        let arrest = line[3].split('/');
        let arrestDate = new Date(arrest[2]+"/"+arrest[0]+"/"+arrest[1]);
        let bail = line[10] != 0;
        let paid = line[11] != 0;

        if(bail && !paid && arrestDate > settings.startDate){

            let newRecord = {
                id: uuid(),
                arrestDay: dateDiffInDays(settings.startDate, arrestDate)
            }

            records.push(newRecord);

        }

       

    }


    let numRecordsToUse = settings.populationCount/100;

    for(let i=0; i<numRecordsToUse; i++){
        let record = records[Math.floor(Math.random()*records.length)];
        
        recordsToUse.push(record);

        records.splice(records.indexOf(record), 1);

    }

    console.log(recordsToUse);

}

init();