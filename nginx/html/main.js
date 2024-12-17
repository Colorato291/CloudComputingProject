const form = document.getElementById("newUserForm");
const endPoint = 'http://localhost:3000' // API link

// Faila augšupielādes funkcija
function uploadFile(type) {
    // Ieguves avots no lapas (iebraukšana vai izbraukšana)
    const fileInput = document.getElementById(type === 'entry' ? 'entryInput' : 'exitInput');
    const file = fileInput.files[0]; // Augšupielādēts fails

    if (!file) { // Ja fails nav pievienots
        alert('Please select a file to upload');
        console.error('No file selected');
        return;
    }

    // Tukšas formas izveide
    const formData = new FormData();
    // Faila ievietošana formā
    formData.append('file', file);
    // API izsaukums
    fetch(`${endPoint}/upload/${type}`, {
        method: 'POST',
        mode: 'cors', // CORS režīms, lai novērstu CORS ierobežojumus
        credentials: 'include',
        headers: {
            'Accept': 'application/json',
        },
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        alert('File uploaded successfully');
        fileInput.value = ''; // Faila izdzēšana no ievades
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error processing image: ' + error.message);
    });
}

// Jauna lietotāja izveidošana
form.addEventListener('submit', addNewUser);
async function addNewUser(event) {
    event.preventDefault();

    const formData = new FormData(form);
    const userData = Object.fromEntries(formData.entries());

    // Tukšo rakstzīmju noņemšana no ierakstiem ciklējot pāri visiem ierakstiem
    Object.keys(userData).forEach(key => {
        userData[key] = userData[key].trim();
        if (!userData[key]) {
            alert('Please fill in all fields');
            return;
        }
    });
    // API izsaukums
    fetch(`${endPoint}/newuser/${type}`, {
        method: 'POST',
        mode: 'cors', // CORS režīms, lai novērstu CORS ierobežojumus
        credentials: 'include',
        headers: {
            'Accept': 'application/json',
        },
        body: JSON.stringify({ data: userData })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        alert('User added successfully');
        form.reset(); // Ievades iztīrīšana
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error adding user: ' + error.message);
    });
}

// Apmaksas automāta simulēšana
async function payForVehicle() {
    // Numurzīmes iegūšana
    const plateInput = document.getElementById('payment');
    const plate = plateInput.value.trim();

    if (!plate) {
        alert('Please enter a vehicle plate');
        return;
    }
    // API izsaukums
    fetch(`${endPoint}/pay`, {
        method: 'POST',
        mode: 'cors', // CORS režīms, lai novērstu CORS ierobežojumus
        credentials: 'include',
        headers: {
            'Accept': 'application/json',
        },
        body: JSON.stringify({ plate: plate })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        alert('Parking paid successfully');
        plateInput.value = ''; // Ievades iztīrīšana
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error paying for parking: ' + error.message);
    });
}