function uploadFile(type) {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    fetch(`/upload/${type}`, {
        method: 'POST',
        body: file
    })
    .then(response => {
        console.log(response);
    })
    .catch(error => {
        console.error(error);
    });
}