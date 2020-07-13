// Constants

const LOCATIONS = Object.freeze({"House":0, "Hospital":1, "Bank":2, "Restaurant":3, "Supermarket":4});
const ROLES = Object.freeze({"Frontliner":0, "NonFrontlinerOut":1, "NonFrontlinerHouse":2});
const STATUS = Object.freeze({"Susceptible":0, "Exposed":1, "Asymptomatic":2, "Symptomatic":3, "Recovered":4, "Dead":5});

// Constants

// Global variables

chartDataPoints = 168;
optimizeSkips = 10;
roleDist = {};
initialStatusDist = {};

buffer = {};
historyHours = [];
historySusceptible = [];
historyExposed = [];
historyInfected = [];
historyRecovered = [];
historyDead = [];
hour = 0;
incubationPeriod = 24*3;
infectionRate = 0.1;
pAsymptomatic = 0.2;
pRecovery = 0.007;
pDeath = 0.003;

testFPRate = null;
testFNRate = null;
testRatio = null;

// Global variables

class Person {
    // schedule format:
    // schedule = {time1:location}

    constructor(id, role, status, house) {
        this.id = id;
        this.house = house;
        this.location = house;
        this.role = role;
        this.status = status;
        this.schedule = {};
        this.incubation = 0;
        this.testedPositive = false;
    }

    addSchedule({hospital=null, bank=null, restaurant=null, supermarket=null} = {}) {
        // 24 hrs x 7 days = 168

        if (this.role==ROLES.Frontliner) {
            for (let day=0; day<7; day++) {
                // let hour = Math.floor(Math.random() * 15) + 5; // 5am - 8pm
                for (let hour=5; hour<15+5; hour++){
                    let hourWeek = day*24 + hour;
                    this.schedule[hourWeek] = hospital;
                }
            }
        }

        if (this.role==ROLES.NonFrontlinerOut) {
            let day = Math.floor(Math.random() * 7);
            let hour = Math.floor(Math.random() * 15) + 5; // 5am - 8pm
            let minDuration = 2, maxDuration = 6;
            let duration = Math.floor(Math.random() * (maxDuration-minDuration));
            
            for (let j=0; j<=duration+minDuration; j++) {
                let hourWeek = day*24 + hour + j;
                this.schedule[hourWeek] = supermarket;
            }
            
        }
    }

    // go to a location based on the person's schedule.
    // house is the default location.    
    goSomewhere(hourWeek) {
        if (this.testedPositive || this.status==STATUS.Symptomatic) {
            this.location = this.house;
        }
        else {
            this.location = this.schedule[hourWeek] ? this.schedule[hourWeek] : this.house;
        }
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

function createWorld(nPeople=100, nHouse=20, nHospital=3, nBank=3, nRestaurants=3, nSupermarket=3, maxPersonInHouse=5) {
    this.houses = genLocation(LOCATIONS.House, nHouse);
    this.hospitals = genLocation(LOCATIONS.Hospital, nHospital);
    this.banks = genLocation(LOCATIONS.Bank, nBank);
    this.restaurants = genLocation(LOCATIONS.Restaurant, nRestaurants);
    this.supermarkets = genLocation(LOCATIONS.Supermarket, nSupermarket);

    this.houseHasPerson = {};
    
    this.people = Array.from(Array(nPeople).keys()).map((id) => {
        let houseNum = Math.floor(Math.random() * nHouse);
        let house = this.houses[houseNum].getReferenceId();
        let role = null;

        if (house in this.houseHasPerson) {
            role = ROLES[sampleWeightedChoice(roleDist)];
            this.houseHasPerson[house].push(id);
        }

        else {
            this.houseHasPerson[house] = [id];
            role = ROLES.NonFrontlinerOut;
        }

        let status = STATUS[sampleWeightedChoice(initialStatusDist)]

        person = new Person(id, role, status, house);

        // // if Symptomatic, test for positive already.
        // if (status==STATUS.Symptomatic) {
        //     person.testedPositive = true;
        // }

        if (role==ROLES.Frontliner) {
            hospitalNum = Math.floor(Math.random() * nHospital);
            hospital = this.hospitals[hospitalNum].getReferenceId();
            person.addSchedule({hospital: hospital});
        }
        else if (role==ROLES.NonFrontlinerOut) {
            supermarketNum = Math.floor(Math.random() * nSupermarket);
            supermarket = this.supermarkets[supermarketNum].getReferenceId();
            person.addSchedule({supermarket: supermarket});
        }

        return person;
    });
}

function lookForAnotherRunner(personIndex) {
    let house = people[personIndex].house;
    for (peopleId of this.houseHasPerson[house]) {
        if (personIndex!=peopleId && people[peopleId].role==ROLES.NonFrontlinerHouse && !people[peopleId].testedPositive) {
            people[peopleId].role = ROLES.NonFrontlinerOut;
            supermarketNum = Math.floor(Math.random() * nSupermarket);
            supermarket = this.supermarkets[supermarketNum].getReferenceId();
            people[peopleId].addSchedule({supermarket: supermarket});
            break;
        }
    }
}

function applyMassTesting() {
    for (let i=0; i<people.length; i++) {
        // skip test if dead or not part of sampling
        if (people[i].status == STATUS.Dead || Math.random >= testRatio) {
            continue;
        }

        if ([STATUS.Symptomatic, STATUS.Exposed, STATUS.Asymptomatic,].includes(people[i].status)) {
            people[i].testedPositive = Math.random() < testFNRate ? false : true;
        }
        else if ([STATUS.Susceptible, STATUS.Recovered].includes(people[i].status)) {
            people[i].testedPositive = Math.random() < testFPRate ? true : false;
        }

        if (people[i].testedPositive) {
            lookForAnotherRunner(i);
        }
    }
}

// Run single time step
function run() {

    hourWeek = hour % (24*7);

    if (massTesting) {
        applyMassTesting();
        // toggleMassTesting();
    }

    // update location, increase incubation period, and update status
    for (let i=0; i<people.length; i++) {
        if (people[i].status == STATUS.Dead) {
            people[i].schedule = {};
            continue;
        }

        people[i].goSomewhere(hourWeek);

        // if exposed, increase incubation timer
        if (people[i].status == STATUS.Exposed) {
            people[i].incubation += 1;
            
            // if incubation period is over, change status to symptomatic or asymptomatic
            if (people[i].incubation >= incubationPeriod) {
                people[i].status = Math.random() <= pAsymptomatic ? STATUS.Asymptomatic : STATUS.Symptomatic;

                // if NonFrontlinerOut, look for someone else in the same house
                if (people[i].status == STATUS.Symptomatic && people[i].role == ROLES.NonFrontlinerOut) {
                    lookForAnotherRunner(i);
                }
            }
        }
        // Will the infected person die, recover, or maintain status quo?
        else if ([STATUS.Symptomatic, STATUS.Asymptomatic].includes(people[i].status)) {
            p = Math.random();
            people[i].status = p < pDeath ? STATUS.Dead : p < pRecovery + pDeath ? STATUS.Recovered : people[i].status;
        }

        // if updated status is one of the ff, just stay at home!
        if ([STATUS.Symptomatic].includes(people[i].status) || people[i].testedPositive==true) {
            // people[i].schedule = {};
            people[i].role = ROLES.NonFrontlinerHouse;
        }
    }

    // spread the disease based on location
    for (loc of [houses, hospitals, banks, restaurants, supermarkets]) {
        for (let i=0; i<loc.length; i++) {
            // check people in the same location
            peopleInfectedIndices = []
            peopleNotInfectedIndices = []
            for (let j=0; j<people.length; j++){
                if (people[j].location == loc[i].getReferenceId()) {
                    // People with the following status can infect already
                    if ([STATUS.Exposed, STATUS.Symptomatic, STATUS.Asymptomatic].includes(people[j].status)){
                        // console.log(people[j].status);
                        peopleInfectedIndices.push(j);
                    }
                    // People with the following status can be infected
                    else if ([STATUS.Susceptible, STATUS.Recovered].includes(people[j].status)){
                        peopleNotInfectedIndices.push(j);
                    }
                }
            }        

            let nInfected = peopleInfectedIndices.length;
            let pNoInfection = (1 - infectionRate)**nInfected;
            let pInfection = 1 - pNoInfection;
            for (let j=0; j<peopleNotInfectedIndices.length; j++) {
                let isInfected = Math.random() <= pInfection;
                if (isInfected) {
                    personNotInfectedIndex = peopleNotInfectedIndices[j];
                    newStatus = STATUS.Exposed;
                    people[personNotInfectedIndex].status = newStatus;
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
    exposed = counts[STATUS.Exposed];
    infected = counts[STATUS.Asymptomatic] + counts[STATUS.Symptomatic];
    recovered = counts[STATUS.Recovered];
    dead = counts[STATUS.Dead];
    return [susceptible, exposed, infected, recovered, dead];
}

// Simulate for single time step, save values, and increase time counter
function iterate(optimize=false) {

    if (hour==0) {
        createWorld(nPeople=nPeople, nHouse=nHouses, nHospital=nHospitals, nSupermarket=nSupermarkets);
    }
    else {
        run();
    }

    let [susceptible, exposed, infected, recovered, dead] = countStatus();
    let arr1 = ['hour', 'susceptible', 'exposed', 'infected', 'recovered', 'dead'];
    let arr2 = [hour, susceptible, exposed, infected, recovered, dead];

    for ([s, val] of zip(arr1, arr2)) {
        if (!this.buffer[s]) {
            this.buffer[s] = [];
        }
        this.buffer[s].push(val);
    }

    if (!optimize || (optimize && (hour%optimizeSkips)==0)) {
        this.historyHours.push(...this.buffer['hour']);
        this.historySusceptible.push(...this.buffer['susceptible']);
        this.historyExposed.push(...this.buffer['exposed']);
        this.historyInfected.push(...this.buffer['infected']);
        this.historyRecovered.push(...this.buffer['recovered']);
        this.historyDead.push(...this.buffer['dead']);
        
        this.buffer = {}

        let history = [this.historyHours, this.historySusceptible, this.historyExposed, this.historyInfected, this.historyRecovered, this.historyDead];

        // let slice = 24*7;
        let len = historyHours.length;
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

    this.hour += 1;
}

// Reset the simulation
function reset() {
    console.log('reset');
    this.hour = 0;
    this.historyHours.length = 0;
    this.historySusceptible.length = 0;
    this.historyExposed.length = 0;
    this.historyInfected.length = 0;
    this.historyRecovered.length = 0;
    this.historyDead.length = 0;
    this.buffer = {};
    
    stackedLine.update();
}

