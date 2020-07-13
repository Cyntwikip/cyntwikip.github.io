// Constants

const LOCATIONS = Object.freeze({"AssignedArea":0, "CR":1, "Entrance":2, "Exit":3, "Out":4});
const STATUS = Object.freeze({"Susceptible":0, "Symptomatic":1, "Asymptomatic":2});

// Constants

// Global variables

chartDataPoints = 168;
optimizeSkips = 10;
roleDist = {};
initialStatusDist = {};

buffer = {};
historyTimeSteps = [];
historySusceptible = [];
historySymptomatic = [];
historyAsymptomatic = [];
timeStep = 0;
infectionPeriod = 15;
// infectionRate = 0.1;

pAsymptomatic = 0.1;
pSocialDistancing = 1.0;
pMask = 1.0;

matrixTogetherness = [];

pSymptomaticTransmission = 0.0526;
// pSymptomaticTransmission = 1;
pAsymptomaticTransmission = pSymptomaticTransmission*0.1;
pSocialDistancingTransmissionReduction = 0.82;
pMaskTransmissionReduction = 0.85;

// with dummy values
amenityDuration = {"Entrance":15, "Exit":15, "CR": 15};
amenityVisitTimes = {"CR": 3};
eventSchedule = {"Ingress": 60, "Egress":60, "Event": 180};

// Global variables

class Person {
    // schedule format:
    // schedule = {time1:location}

    constructor(id, masked, socialDistancing, status, assignedArea) {
        this.id = id;
        this.incubation = false;
        this.masked = masked;
        this.socialDistancing = socialDistancing;
        this.assignedArea = assignedArea;
        this.location = assignedArea;
        this.status = status;
        this.schedule = {};
    }

    addSchedule(nCRs, nEntrances, nExits) {
        let maxTime = eventSchedule['Ingress'] + eventSchedule['Event'] + eventSchedule['Egress'];

        let outArea = out[0].getReferenceId();

        let entranceNum = Math.floor(Math.random() * nEntrances);
        let entrance = entrances[entranceNum].getReferenceId();
        let entranceDur = amenityDuration['Entrance'];
        let entranceStartTime = Math.floor(Math.random() * (eventSchedule['Ingress'] - entranceDur));

        // // add out of venue sched
        // for (let i=0; i<entranceStartTime; i++){
        //     this.schedule[i] = outArea;
        // }

        // add ingress sched
        for (let i=0; i<entranceDur; i++){
            let timeStep = entranceStartTime + i;
            this.schedule[timeStep] = entrance;
        }

        let exitNum = Math.floor(Math.random() * nExits);
        let exit = exits[exitNum].getReferenceId();
        let exitDur = amenityDuration['Exit'];
        let venueEndTime = maxTime - eventSchedule['Egress'];
        let exitStartTime = Math.floor(Math.random() * (eventSchedule['Egress'] - exitDur)) + venueEndTime;

        // add egress sched
        for (let i=0; i<exitDur; i++){
            let timeStep = exitStartTime + i;
            this.schedule[timeStep] = exit;
        }

        let personVenueStartTime = entranceStartTime + entranceDur; // per person
        let personVenueEndTime = exitStartTime+exitDur; // per person

        // add assigned area sched
        for (let i=personVenueStartTime; i<exitStartTime; i++){
            let timeStep = i;
            this.schedule[timeStep] = this.assignedArea;
        }

        // // add out of venue sched
        // for (let i=personVenueEndTime; i<maxTime; i++){
        //     this.schedule[i] = outArea;
        // }

        let crNum = Math.floor(Math.random() * nCRs);
        let cr = crs[crNum].getReferenceId();
        let crDur = amenityDuration['CR'];

        // add CR sched
        for (let crVisits=0; crVisits<amenityVisitTimes['CR']; crVisits++) {
            // let timeStep = Math.floor(Math.random() * 15) + 5; // 5am - 8pm
            let crStartTime = Math.floor(Math.random() * (exitStartTime - personVenueStartTime)) + personVenueStartTime;
            for (let i=0; i<crDur; i++){
                let timeStep = crStartTime + i;
                this.schedule[timeStep] = cr;
            }
        }
    }

    // // go to a location based on the person's schedule.
    // // assigned area is the default location.   
    // goSomewhere(timeStep) {
    //     let location = this.schedule[timeStep] ? this.schedule[timeStep] : this.assignedArea;
    //     // reset counter if location changed or outside the venue
    //     if(this.location!=location | location==LOCATIONS.Out) {
    //         for(let i=0; i<people.length; i++) {
    //             matrixTogetherness[i][this.id] = 0; // row
    //             matrixTogetherness[this.id][i] = 0; // col
    //         }
    //     }
    //     this.location = location
    // }

    // go to a location based on the person's schedule.
    // outside is the default location.    
    goSomewhere(timeStep) {
        let location = this.schedule[timeStep] ? this.schedule[timeStep] : out[0].getReferenceId();
        // reset counter if location changed or outside the venue
        if(this.location!=location | location==LOCATIONS.Out) {
            for(let i=0; i<people.length; i++) {
                matrixTogetherness[i][this.id] = 0; // row
                matrixTogetherness[this.id][i] = 0; // col
            }
        }
        this.location = location
    }
}

class Location {
    constructor(type, id) {
        this.type = type,
        this.id = id;
    }

    getReferenceId() {
        let typeKey = Object.keys(LOCATIONS)[this.type];
        return String(typeKey) + String(this.id);
    }
}

function genLocation(locationType, n) {
    return Array.from(Array(n).keys()).map((id) => {
        return new Location(locationType, id);
    });
}

function createWorld(nPeople=100, nAssignedAreas=4, nCRs=3, nEntrances=3, nExits=3) {
    this.assignedAreas = genLocation(LOCATIONS.AssignedArea, nAssignedAreas);
    this.crs = genLocation(LOCATIONS.CR, nCRs);
    this.entrances = genLocation(LOCATIONS.Entrance, nEntrances);
    this.exits = genLocation(LOCATIONS.Exit, nExits);
    this.out = genLocation(LOCATIONS.Out, 1);
    
    this.people = Array.from(Array(nPeople).keys()).map((id) => {
        let areaNum = Math.floor(Math.random() * nAssignedAreas);
        // console.log(nAssignedAreas);
        // console.log(areaNum);
        let assignedArea = this.assignedAreas[areaNum].getReferenceId();
        let status = STATUS[sampleWeightedChoice(initialStatusDist)];
        let masked = Math.random() <= pMask;
        let socialDistancing = Math.random() <= pSocialDistancing;

        person = new Person(id, masked, socialDistancing, status, assignedArea);
        person.addSchedule(nCRs, nEntrances, nExits);

        return person;
    });

    // initialize togetherness matrix counter
    matrixTogetherness = new Array(nPeople);
    for(let i=0; i<nPeople; i++) {
        matrixTogetherness[i] = new Array(nPeople).fill(0);
    }
}

function infect(donor, recipient) {
    // if the virus is still incubating, skip.
    if (donor.incubation) {
        return
    }

    let transmissionRate = 1;
    transmissionRate *= (donor.status == STATUS.Symptomatic) ? pSymptomaticTransmission : 1;
    transmissionRate *= (donor.status == STATUS.Asymptomatic) ? pAsymptomaticTransmission : 1;
    transmissionRate *= (donor.socialDistancing & recipient.socialDistancing) ? pSocialDistancingTransmissionReduction : 1;
    transmissionRate *= (donor.masked & recipient.masked) ? pMaskTransmissionReduction : 1;
    
    let isInfected = Math.random() <= transmissionRate;
    
    if (isInfected) {
        let newStatus = Math.random() <= pAsymptomatic ? STATUS.Asymptomatic : STATUS.Symptomatic;
        people[recipient.id].status = newStatus;
        people[recipient.id].incubation = true;
    }
}

// Run single time step
function run() {

    // increment each element in matrix
    matrixTogetherness = matrixTogetherness.map((row) => row.map((x) => x+1));

    // update location
    for (let i=0; i<people.length; i++) {
        people[i].goSomewhere(timeStep);
    }

    // // spread the disease based on location
    // for (locType of [assignedAreas, crs, entrances, exits]) {
    //     for (let loc=0; loc<locType.length; loc++) {
    //         // check people in the same location
    //         for (let i=0; i<people.length; i++) {
    //             for (let j=i+1; j<people.length; j++) {
    //                 if (people[j].location == locType[loc].getReferenceId()) {

    //                     let stayedTogetherForTooLong = false;
    //                     if (matrixTogetherness[i][j] >= infectionPeriod) {
    //                         matrixTogetherness[i][j] = 0; // reset counter
    //                         matrixTogetherness[j][i] = 0; // reset counter
    //                         stayedTogetherForTooLong = true;
    //                     }

    //                     if (stayedTogetherForTooLong) {
    //                         let person1Infected = [STATUS.Symptomatic, STATUS.Asymptomatic].includes(people[i].status);
    //                         let person2Infected = [STATUS.Symptomatic, STATUS.Asymptomatic].includes(people[j].status);

    //                         if ((person1Infected + person2Infected) == 1) {
    //                             let donor = person1Infected ? people[i] : people[j];
    //                             let recipient = person1Infected ? people[j] : people[i];
                                
    //                             infect(donor, recipient)
    //                         }
    //                     }
    //                 }
    //             }     
    //         }   

    //     }
    // }

    // spread the disease based on location
    for (locType of [assignedAreas, crs, entrances, exits]) {
        for (let loc=0; loc<locType.length; loc++) {
            // check people in the same location
            for (let i=0; i<people.length; i++) {
                for (let j=i+1; j<people.length; j++) {
                    if (people[j].location == locType[loc].getReferenceId() & people[j].location == people[i].location) {

                        let stayedTogetherForTooLong = false;
                        if (matrixTogetherness[i][j] >= infectionPeriod) {
                            matrixTogetherness[i][j] = 0; // reset counter
                            matrixTogetherness[j][i] = 0; // reset counter
                            stayedTogetherForTooLong = true;
                        }

                        if (stayedTogetherForTooLong) {
                            let person1Infected = [STATUS.Symptomatic, STATUS.Asymptomatic].includes(people[i].status);
                            let person2Infected = [STATUS.Symptomatic, STATUS.Asymptomatic].includes(people[j].status);

                            if ((person1Infected + person2Infected) == 1) {
                                let donor = person1Infected ? people[i] : people[j];
                                let recipient = person1Infected ? people[j] : people[i];
                                
                                infect(donor, recipient)
                            }
                        }
                    }
                }     
            }   

        }
    }

}

// Global counter for status
function countStatus() {
    counts = valueCounts(this.people.map((d) => {
        return d['status'];
    }));

    Object.values(STATUS).map((key) => {
        if (!(key in counts)) {
            counts[key] = 0;
        } 
    });

    susceptible = counts[STATUS.Susceptible];
    symptomatic = counts[STATUS.Symptomatic];
    asymptomatic = counts[STATUS.Asymptomatic];
    return [susceptible, symptomatic, asymptomatic];
}

// Simulate for single time step, save values, and increase time counter
function iterate(optimize=false) {

    if (timeStep==0) {
        createWorld(nPeople=nPeople, nAssignedAreas=nAssignedAreas, nCRs=nCRs, nEntrances=nEntrances, nExits=nExits);
    }
    else {
        run();
    }

    let [susceptible, symptomatic, asymptomatic] = countStatus();
    let arr1 = ['timeStep', 'Susceptible', 'Symptomatic', 'Asymptomatic'];
    let arr2 = [timeStep, susceptible, symptomatic, asymptomatic];

    for ([s, val] of zip(arr1, arr2)) {
        if (!this.buffer[s]) {
            this.buffer[s] = [];
        }
        this.buffer[s].push(val);
    }

    if (!optimize || (optimize && (timeStep%optimizeSkips)==0)) {
        this.historyTimeSteps.push(...this.buffer['timeStep']);
        this.historySusceptible.push(...this.buffer['Susceptible']);
        this.historySymptomatic.push(...this.buffer['Symptomatic']);
        this.historyAsymptomatic.push(...this.buffer['Asymptomatic']);
        
        this.buffer = {}

        let history = [this.historyTimeSteps, this.historySusceptible, this.historySymptomatic, this.historyAsymptomatic];

        // let slice = 24*7;
        let len = historyTimeSteps.length;
        if (len > chartDataPoints) {
            for (s of history) {
                if (len + 1 == chartDataPoints) {
                    s.shift();
                }
                else {
                    s.reverse().splice(chartDataPoints);
                    s.reverse();
                }
            }
        }
        
        stackedLine.update();
    }

    this.timeStep += 1;
}

// Reset the simulation
function reset() {
    console.log('reset');
    this.timeStep = 0;
    this.historyTimeSteps.length = 0;
    this.historySusceptible.length = 0;
    this.historySymptomatic.length = 0;
    this.historyAsymptomatic.length = 0;
    this.buffer = {};
    
    stackedLine.update();
}

