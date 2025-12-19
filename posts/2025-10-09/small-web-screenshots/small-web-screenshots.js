// leaflet stuff
const map = L.map('map', {crs:L.CRS.Simple}).setView([-195, 208], 0);
const ne = [42, 460];
const sw = [-432, -42];
map.setMaxBounds([sw, ne]);
const tiles = L.tileLayer(
    'https://smallwebscreenshots.s3.us-east-1.amazonaws.com/v1/tiles/{z}/{x}/{y}.jpg',
    {
        maxBoundsViscosity:1,
        maxZoom: 10,
        minZoom: 0,
        noWrap: true,
        zoomReverse: true,
        bounds: [[-391, 0], [0, 418]]
    },
).addTo(map);
map.addControl(new L.Control.Fullscreen());

let isDragging = false;
const ssw = 512; // screenshot width @ z = 0
const ssp = 32;  // screenshot padding @ z = 0
const sessionId = crypto.randomUUID();

// leaflet cursor
function overScreenshot(latlng) {

    // only allow url clicking above zoom level 8
    if (map.getZoom() >= 8) {

        // determine the projected cursor position
        const xy = L.CRS.Simple.latLngToPoint(latlng, 10);
        
        // skip everything not within the map bounds
        if (xy.x > 0 && xy.y > 0 && xy.x <= 427552 && xy.y <= 400352) {

            // determine if the cursor is currently over a clickable screenshot
            if (xy.y % (ssw + ssp) <= ssw && xy.x % (ssw + ssp) <= ssw) {
                return true
            }
        }
    }

    return false
}

function checkAndSetCursor(latlng) {

    // reset the cursor
    map.getContainer().style.cursor = '';

    // change the cursor when it's over a clickable screenshot
    if(overScreenshot(latlng)) {
        map.getContainer().style.cursor = 'pointer';
    } else {
        map.getContainer().style.cursor = '';
    }
}

map.on('mousemove', function(e) {
    if (isDragging) {
        return
    }

    checkAndSetCursor(e.latlng);
});


// when the cursor is over a clickable element but is dragging the map, 
// override the pointer
map.on('mousedown', function() {
    isDragging = true;
    map.getContainer().style.cursor = 'grabbing';
});

map.on('mouseup', function(e) {
    isDragging = false;
    checkAndSetCursor(e.latlng);
});

// open urls when a user clicks on a screenshot
map.on('click', async function(e) {

    // check if we're within the bounds of a screenshot
    if (overScreenshot(e.latlng)) {

        // get the north east corner of the current screenshot
        const xy = L.CRS.Simple.latLngToPoint(e.latlng, 10);
        const ss_x = Math.floor(xy.x / (ssw + ssp))
        const ss_y = Math.floor(xy.y / (ssw + ssp))

        if (ss_x == 94 && ss_y == 99) {
            L.popup().setLatLng(e.latlng).setContent("You found Waldo! 🎉").openOn(map);
        } else if (searchForm.style.display === 'none') {

            // open new window immediately
            const newWindow = window.open('about:blank', 'smallwebscreenshot' + Date.now());

            if (!newWindow) {
                alert("Please allow popups to open screenshots!");
                return;
            }

            try {
                const response = await fetch(`https://smallwebscreenshots.s3.us-east-1.amazonaws.com/v1/blocks/${ss_x}/${ss_y}.html`)
                if (response.ok) {
                    const url = await response.text();
                    console.log(`> opening: ${url.trim()}`)
                    newWindow.location.href = 'https://' + url.trim() + '/?ref=smallwebscreenshots';

                } else {
                    // Close it if the fetch failed
                    newWindow.close();
                }
            } catch (err) {
                console.warn('Failed to get url file, err', err);
                newWindow.close();
            }
            
        }
        sendMapEvent(clickPosition=xy);
    }
});

// this is for another side project ;)
const sendMapEvent = (clickPosition = null) => {
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const z = map.getZoom();
    const sw_projected = L.CRS.Simple.latLngToPoint(sw, 10);
    const ne_projected = L.CRS.Simple.latLngToPoint(ne, 10);

    // don't forget that the leaflet origin is at the top left. y+ is down, y- is up.
    const data = {
        s: sessionId,
        z: z,
        b: {
            xmin: sw_projected.x,
            xmax: ne_projected.x,
            ymin: sw_projected.y,
            ymax: ne_projected.y
        }
    }

    // only populated when a screenshot is clicked
    if (clickPosition) {
        data.c = {
            x: clickPosition.x,
            y: clickPosition.y
        }
    }
            
    // send the map event
    fetch('https://screenshots-event-tracking-production.up.railway.app/api/map-position-update', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
};

map.on('moveend', function() {
    sendMapEvent();
});

// capture the elements we need
const randomButton = document.getElementById('random-button');
const searchForm = document.getElementById('search-form');
const searchButton = document.getElementById('search-button');
const searchInput = document.getElementById('search-input');
const searchSuggestions = document.getElementById('search-suggestions');
let currentSelectionIndex = -1;

// keep the map from moving when clicking on the search icon
L.DomEvent.disableClickPropagation(searchButton);
L.DomEvent.disableClickPropagation(searchSuggestions);
L.DomEvent.disableClickPropagation(searchForm);
L.DomEvent.disableClickPropagation(searchInput);
L.DomEvent.disableClickPropagation(randomButton);
L.DomEvent.disableScrollPropagation(searchButton);

// when an autocomplete suggestion is highlighted, we don't want the
// users click or enter button event to propagate down to the screenshot
// layer triggering a url open event.
L.DomEvent.on(searchForm, 'click', function (ev) {
    L.DomEvent.stopPropagation(ev);
});

// flyto function that includes coordinate projection
const flyto_xy = (x, y) => {
    xy = map.unproject(L.point(x, y), 10);
    reset_search();
    searchInput.blur();
    map.flyTo([xy.lat, xy.lng], 10, {animate: true, duration: 3})
}

// flyto a random screenshot
const flyto_random = () => {

    // pick a random screenshot index position
    const xmax = 786;
    const ymax = 736;
    const xIdx = Math.floor(Math.random() * (xmax + 1));
    const yIdx = Math.floor(Math.random() * (ymax + 1));

    // convert the index position to actual coordinates
    const x = (xIdx * ssw) + (xIdx * ssp) + Math.round(ssw / 2);
    const y = (yIdx * ssw) + (yIdx * ssp) + Math.round(ssw / 2);

    flyto_xy(x, y)
}

// clear and reset the search form
const reset_search = () => {
    searchForm.style.display = 'none';
    searchInput.style.display = 'none';
    searchInput.value = '';
    searchSuggestions.style.display = 'none';
    searchSuggestions.innerHTML = '';
    currentSelectionIndex = -1;
}

// listener to hide the search box when the escape key is pressed
document.addEventListener('keyup', (event) => {
    if (event.key == 'Escape') {
        reset_search();
    }
});

// listener to hide the search box when the user clicks outside of the search form
document.addEventListener('click', (event) => {
    const target = event.target
    if (searchForm.style.display !== 'none') {

        // check that the target is not the search button and not inside the search form
        if (target !== searchButton && !searchForm.contains(target))
        reset_search()
    }
});

// listener to hide/reveal the search dialog box upon receiving a click
searchButton.addEventListener('click', () => {
    if (searchForm.style.display === 'none') {
        // if it's currently hidden, reveal it.
        searchForm.style.display = 'block';
        searchInput.style.display = 'block';
        searchInput.focus();
        searchSuggestions.style.display = 'none';
    } else {
        // if it's currently visible, reset/hide it.
        searchForm.style.display = 'none';
        searchInput.style.display = 'none';
        searchInput.value = '';
        searchSuggestions.style.display = 'none';
        searchSuggestions.innerHTML = '';
        currentSelectionIndex = -1;
    }
});

// autocomplete event listener
searchInput.addEventListener('input', async function() {

    // clear previous results if they exist
    searchSuggestions.innerHTML = '';

    // capture the query
    let query = this.value.trim().toLowerCase();

    // remove some common prefixes
    if(query.startsWith('http://')) {
        query = query.substring(7);
    } else if (query.startsWith('https://')) {
        query = query.substring(8);
    }
    if (query.startsWith('www.')) {
        query = query.substring(4);
    }

    // only proceed if the user has typed at least three characters
    if (query.length >= 3) {

        // build the path name
        const path = 'https://smallwebscreenshots.s3.us-east-1.amazonaws.com/v1/autocomplete/' + query.length + '/' + query + '.html'
        console.log(`autocomplete -> fetching prefix file: ${path}`)

        // reveal the search results dialog
        searchSuggestions.style.display = 'block'

        // get the autocomplete suggestions
        const response = await fetch(path);
        if (response.ok) {
            const htmlContent = await response.text();
            currentSelectionIndex = -1;
            searchSuggestions.innerHTML = htmlContent;
        } else {
            console.warn('Autocomplete file not found!');
            searchSuggestions.innerHTML = 'No suggestions found...';
        }
    } else {

        // hide and clear the search suggestions, reset scroll index
        searchSuggestions.style.display = 'none';
        searchSuggestions.innerHTML = '';
        currentSelectionIndex = -1;
    }
});

function syncHighlight(newElement) {
    // 1. Get all suggested items
    const suggestedItems = searchSuggestions.querySelectorAll('li');
    const totalItems = suggestedItems.length;

    // 2. Remove highlight from ALL items (cleans up previous selection)
    suggestedItems.forEach(item => item.classList.remove('highlight'));

    // 3. Determine the new index and apply the highlight to the new element
    if (newElement && totalItems > 0 && Array.from(suggestedItems).includes(newElement)) {
        // newElement is a valid suggestion item
        newElement.classList.add('highlight');
        // Update the global index to match the element's position
        currentSelectionIndex = Array.from(suggestedItems).indexOf(newElement);
    } else {
        // No element is selected (e.g., mouse moved out of the list or null passed)
        currentSelectionIndex = -1;
    }
}

// Re-enable mouse interaction when the mouse moves
searchSuggestions.addEventListener('mousemove', () => {
    // Only do this if we are currently in "keyboard mode"
    if (searchSuggestions.classList.contains('disable-mouse-hover')) {
        searchSuggestions.classList.remove('disable-mouse-hover');
    }
});

// Your existing mouseover logic stays here (to handle the actual highlighting)
searchSuggestions.addEventListener('mouseover', (event) => {
    const listItem = event.target.closest('li');
    if (listItem && searchSuggestions.contains(listItem)) {
        syncHighlight(listItem);
    }
});

// Event listener for mouse movement within the suggestions box
searchSuggestions.addEventListener('mouseover', (event) => {

    // clear keyboard mode immediately upon mouse interaction
    clearTimeout(searchSuggestions.keyboardModeTimeout);
    searchSuggestions.classList.remove('keyboard-nav');

    // find the nearest list item ancestor of the element the mouse is over
    const listItem = event.target.closest('li');

    // check if we hovered over an actual <li> inside the searchSuggestions container
    if (listItem && searchSuggestions.contains(listItem)) {

        // synchronize the keyboard index to the hovered item's index
        syncHighlight(listItem);
    }
});

// event listener for when the mouse leaves the entire suggestions box
searchSuggestions.addEventListener('mouseout', (event) => {

    // check if the mouse is leaving the container *to* an element outside of it
    if (!searchSuggestions.contains(event.relatedTarget)) {

        // clear all highlights and reset the index
        syncHighlight(null); 
    }
});

function enableKeyboardMode(container) {
    // 1. Add the class immediately to disable hover styles
    container.classList.add('keyboard-nav');

    // 2. Clear any existing timeout
    clearTimeout(container.keyboardModeTimeout);

    // 3. Set a new timeout to remove the class after a short delay (e.g., 500ms)
    // This allows the user to navigate and briefly pause without the hover immediately kicking in.
    container.keyboardModeTimeout = setTimeout(() => {
        container.classList.remove('keyboard-nav');
    }, 500);
}

// keydown listener for search suggestions (MODIFIED)
searchInput.addEventListener('keydown', (event) => {
    
    // only run if the we have suggestions
    if (searchSuggestions.style.display !== 'none') {

        const suggestedItems = searchSuggestions.querySelectorAll('li');
        const totalItems = suggestedItems.length;
        const totalStates = totalItems + 1; // N items + 1 unselected state (-1)

        if (totalItems === 0) return;

        // check for up or down arrow
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {

            searchSuggestions.classList.add('disable-mouse-hover');

            event.preventDefault();

            // Calculate the new index position
            let newIndex;
            if (event.key === 'ArrowDown') {
                newIndex = (currentSelectionIndex + 1) % totalStates;
            } else if (event.key === 'ArrowUp') {
                newIndex = (currentSelectionIndex - 1 + totalStates) % totalStates;
            }
            
            // Determine the element to highlight based on the new index
            // If newIndex equals totalItems (the cycling point), it means no item is selected (index -1)
            const newSelectionIndex = (newIndex === totalItems) ? -1 : newIndex;
            
            const elementToHighlight = (newSelectionIndex !== -1) ? suggestedItems[newSelectionIndex] : null;

            // Use the shared function to update index and highlighting
            syncHighlight(elementToHighlight);
        
        // if the user hits enter on a selected item, simulate a click
        } else if (event.key === 'Enter') {
            // ... (Your existing Enter logic remains the same)
            event.preventDefault();
            if (currentSelectionIndex !== -1) {
                suggestedItems[currentSelectionIndex].click();
            }
        }
    }
});