// Constants

const LOCATIONS = Object.freeze({"House":0, "Hospital":1, "Bank":2, "Restaurant":3, "Supermarket":4});
const ROLES = Object.freeze({"Frontliner":0, "NonFrontlinerOut":1, "NonFrontlinerHouse":2});
const STATUS = Object.freeze({"Susceptible":0, "Exposed":1, "Asymptomatic":2, "Symptomatic":3, "Immune":4, "Dead":5});

// Constants

class Person {
    // schedule format:
    // schedule = {time1:location}

    constructor(role, status, house) {
        this.house = house;
        this.location = this.house;
        this.role = role;
        this.status = status;
        this.schedule = {};
    }

    addSchedule(hospital=null, bank=null, restaurant=null, supermarket=null) {
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
            let duration = Math.floor(Math.random() * 4); // max of 5 hrs
            
            for (let j=0; j<duration; j++) {
                let hourWeek = day*24 + hour + j;
                this.schedule[hourWeek] = supermarket;
            }
            
        }
    }

    // go to a location based on the person's schedule.
    // house is the default location.    
    goSomewhere(hourWeek) {
        this.location = this.schedule[hourWeek] ? this.schedule[hourWeek] : this.house;
    }
}

// class Frontliner extends Person {
//     constructor(role, status, house) {
//         super(role, status, house);

//     }
// }

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

// class House extends Location {
//     constructor(type, id) {
//         super(type, id);
//         this.settler = None;
//     }

//     addSettler(settlers) {
//         this.settlers = settlers;
//     }
// }

function genLocation(locationType, n) {
    return Array.from(Array(n).keys()).map((id) => {
        return new Location(locationType, id);
    });
}

function createWorld(nPeople=100, nHouse=20, nHospital=3, nBank=3, nRestaurants=3, nSupermarket=3, maxPersonInHouse=5) {
    // for (let i=0; i<nHouse; i++) {
    //     house = new House(LOCATIONS.House, i);
    //     nSettlers = Math.floor(Math.random() * maxPersonInHouse-1) + 1;
    //     for (let j=0; j<nSettlers; j++) {
    //         person = new Person()
    //     }
    // }

    this.houses = genLocation(LOCATIONS.House, nHouse);
    this.hospitals = genLocation(LOCATIONS.Hospital, nHospital);
    this.banks = genLocation(LOCATIONS.Bank, nBank);
    this.restaurants = genLocation(LOCATIONS.Restaurant, nRestaurants);
    this.supermarkets = genLocation(LOCATIONS.Supermarket, nSupermarket);
    
    this.people = Array.from(Array(nPeople).keys()).map((d) => {
        houseNum = Math.floor(Math.random() * nHouse);
        house = this.houses[houseNum].getReferenceId();
        let role = ROLES[sampleWeightedChoice({'Frontliner': 20, 
                                           'NonFrontlinerOut': 40,
                                           'NonFrontlinerHouse': 40})];

        // not using let causes the variable to become string instead of int...
        let status = STATUS[sampleWeightedChoice({'Susceptible': 95, 
                                              'Exposed': 0,
                                              'Asymptomatic': 0,
                                              'Symptomatic': 5,
                                              'Immune': 0,
                                              'Dead': 0})];

        person = new Person(role, status, house);
        // console.log(person);

        if (role==ROLES.Frontliner) {
            hospitalNum = Math.floor(Math.random() * nHospital);
            hospital = this.hospitals[hospitalNum].getReferenceId();
            person.addSchedule(hospital=hospital);
        }
        else if (role==ROLES.NonFrontlinerOut) {
            supermarketNum = Math.floor(Math.random() * nSupermarket);
            supermarket = this.supermarkets[supermarketNum].getReferenceId();
            person.addSchedule(supermarket=supermarket);
        }

        return person;
    });
}

historyHours = [];
historySusceptible = [];
historyExposed = [];
historyInfected = [];
historyRecovered = [];
hour = 0;
infectionRate = 0.1;
pAsymptomatic = 0.2;

function run() {

    hourWeek = hour % 24*7;

    // update location
    for (let i=0; i<people.length; i++) {
        people[i].goSomewhere(hourWeek);
    }

    for (loc of [houses, hospitals, banks, restaurants, supermarkets]) {
        for (let i=0; i<loc.length; i++) {
            // check people in the same location
            peopleInfectedIndices = []
            peopleNotInfectedIndices = []
            for (let j=0; j<people.length; j++){
                if (people[j].location == loc[i].getReferenceId()) {
                    if ([STATUS.Symptomatic, STATUS.Asymptomatic].includes(people[j].status)){
                        // console.log(people[j].status);
                        peopleInfectedIndices.push(j);
                    }
                    else {
                        peopleNotInfectedIndices.push(j);
                    }
                }
            }        
            // console.log(loc[i].getReferenceId());
            // console.log(peopleInfectedIndices);
            let nInfected = peopleInfectedIndices.length;
            let pNoInfection = (1 - infectionRate)**nInfected;
            let pInfection = 1 - pNoInfection;
            for (let j=0; j<peopleNotInfectedIndices.length; j++) {
                let isInfected = Math.random() <= pInfection;
                if (isInfected) {
                    personNotInfectedIndex = peopleNotInfectedIndices[j];

                    newStatus = Math.random() <= pAsymptomatic ? STATUS.Asymptomatic : STATUS.Symptomatic;
                    people[personNotInfectedIndex].status = newStatus;
                }
            }
        }
    }

}

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
    recovered = counts[STATUS.Immune]+ counts[STATUS.Dead];

    return [susceptible, exposed, infected, recovered];
}

function iterate() {
    this.historyHours.push(hour);

    if (hour==0) {
        // createWorld();

        createWorld(nPeople=nPeople, nHouse=nHouses, nHospital=nHospitals, nSupermarket=nSupermarkets);
    }
    else {
        run();
    }

    let [susceptible, exposed, infected, recovered] = countStatus();

    // console.log(susceptible);
    // console.log(exposed);
    // console.log(infected);
    // console.log(recovered);

    this.historySusceptible.push(susceptible);
    this.historyExposed.push(exposed);
    this.historyInfected.push(infected);
    this.historyRecovered.push(recovered);

    stackedLine.update();
    this.hour += 1;
}

function reset() {
    console.log('reset');
    this.hour = 0;
    this.historyHours.length = 0;
    this.historySusceptible.length = 0;
    this.historyExposed.length = 0;
    this.historyInfected.length = 0;
    this.historyRecovered.length = 0;
    
    stackedLine.update();
}

