// function weightedChoice(array, weights) {
//     let s = weights.reduce((a, e) => a + e);
//     let r = Math.random() * s;
//     return array.find((e, i) => (r -= weights[i]) < 0);
// }

// // https://stackoverflow.com/questions/30203362/how-to-generate-a-random-weighted-distribution-of-elements
// function weightedChoice(dict) {
//     let elems = Object.keys(dict);
//     let weights = Object.values(dict);
//     console.log(elems, weights)

//     var weighedElems = [];
//     var currentElem = 0;

//     while (currentElem < elems.length) {
//     for (i = 0; i < weights[currentElem]; i++)
//         weighedElems[weighedElems.length] = elems[currentElem];
//         currentElem++;
//     }
  
//     return mostFrequent(weighedElems);
// }

window.chartColors = {
	red: 'rgb(255, 99, 132)',
	orange: 'rgb(255, 159, 64)',
	yellow: 'rgb(255, 205, 86)',
	green: 'rgb(75, 192, 192)',
	blue: 'rgb(54, 162, 235)',
	purple: 'rgb(153, 102, 255)',
	grey: 'rgb(201, 203, 207)'
};


function mostFrequent(arr) {
    let counts = arr.reduce((a, c) => {
      a[c] = (a[c] || 0) + 1;
      return a;
    }, {});
    let maxCount = Math.max(...Object.values(counts));
    return Object.keys(counts).filter(k => counts[k] === maxCount);
}

function sampleWeightedChoice(dict) {
    let elem = null;
    let maxValue = 0;

    Object.keys(dict).map(function(key, index) {
        let value = Math.random() * dict[key];
        if (value >= maxValue) {
            maxValue = value;
            elem = key;
        }
    });

    return elem;
}

function unpack(rows, key) {
    return rows.map(function(row) { return row[key]; });
}

function zip(arr1, arr2) {
    return arr1.map((k, i) => [k, arr2[i]]);
}

function valueCounts(arr) {
    var counts = {};

    for (var i = 0; i < arr.length; i++) {
        var num = arr[i];
        counts[num] = counts[num] ? counts[num] + 1 : 1;
    }

    return counts
}

function filterObjectKeys(d, filteredKeys) {
    return filteredKeys.reduce((obj, key) => ({...obj, [key]: d[key]}), {});
}

