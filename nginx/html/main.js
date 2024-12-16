const form = document.getElementById("newUserForm");
const endPoint = 'http://localhost:3000'

function uploadFile(type) {
    const fileInput = document.getElementById(type === 'entry' ? 'entryInput' : 'exitInput');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select a file to upload');
        console.error('No file selected');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    fetch(`${endPoint}/upload/${type}`, {
        method: 'POST',
        mode: 'cors',
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
        fileInput.value = ''; // Clear the file input
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error processing image: ' + error.message);
    });
}

form.addEventListener('submit', addNewUser);
async function addNewUser(event) {
    event.preventDefault();

    const formData = new FormData(form);
    const userData = Object.fromEntries(formData.entries());

    // Trim all inputs
    Object.keys(userData).forEach(key => {
        userData[key] = userData[key].trim();
        if (!userData[key]) {
            alert('Please fill in all fields');
            return;
        }
    });

    try {
        const response = await fetch(`${endPoint}/newuser`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ data: userData })
        });

        const result = await response.json();

        if (response.ok) {
            alert('User added successfully!');
            form.reset(); // Reset the form
        } else {
            throw new Error(result.error || 'User registration failed');
        }
    } catch (error) {
        console.error('User registration error:', error);
        alert(`Error: ${error.message}`);
    }
}

async function payForVehicle() {
    const plateInput = document.getElementById('payment');
    const plate = plateInput.value.trim();

    if (!plate) {
        alert('Please enter a vehicle plate');
        return;
    }

    try {
        const response = await fetch(`${endPoint}/pay`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ plate: plate })
        });

        const result = await response.json();

        if (response.ok) {
            alert('Payment processed successfully!');
            plateInput.value = '';
        } else {
            throw new Error(result.error || 'Payment failed');
        }
    } catch (error) {
        console.error('Payment error:', error);
        alert(`Error: ${error.message}`);
    }
}