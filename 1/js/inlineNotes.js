// Nathan A. Rooy 

function inlineNotes(note_id) {
    
    var status = document.getElementById(note_id + '-data').style.display;
    
    // IGNORE HYPERLINKS
        // something should go here...

    if (status === 'none') {
        document.getElementById(note_id + '-data').style.display = 'block';
        document.getElementById(note_id).innerHTML = "[-]";        
    }
    
    if (status === 'block') {
        document.getElementById(note_id + '-data').style.display = 'none';
        document.getElementById(note_id).innerHTML = "[+]";        
    }

}