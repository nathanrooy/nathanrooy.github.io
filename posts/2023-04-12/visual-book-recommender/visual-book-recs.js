// establish leaflet map
var map = L.map('map', {crs:L.CRS.Simple}).setView([-128, 128], 2);
const map_padding = 5;
map.setMaxBounds([
    [ -71.75 + map_padding , 210.5 + map_padding],
    [-184.25 - map_padding ,  45.5 - map_padding]
]);
const mytile = L.tileLayer(
    'https://visual-book-recommender-v1.s3.amazonaws.com/tiles/{z}/{x}/{y}.jpg',
    {
        maxBoundsViscosity:1,
        maxZoom: 11,
        minZoom: 2,
        noWrap: true,
        tms: false,
    },
).addTo(map);
map.addControl(new L.Control.Fullscreen());

// metadata display 
const book_title   = 0;
const book_series  = 1;
const book_authors = 2;
const book_desc    = 3;
const book_left    = 4;
const book_right   = 5;
const book_top     = 6;
const book_bottom  = 7;
const n_rows = 8;
var metadata_cache = new Map();

const parse_block = (rows, xy, click_latlng) => {
    var found_match = null;
    for (let i=0; i<rows.length; i++) {
        const row = rows[i].split('|');
        if (row.length == n_rows) {
            // note that book_top is considered the "bottom" edge because leaflet reverses the y-axis
            if(
                parseInt(row[book_left]) <= xy.x && xy.x <= parseInt(row[book_right]) &&
                parseInt(row[book_top]) <= xy.y && xy.y <= parseInt(row[book_bottom])) {
                found_match = row;
                break;
            }
        }
    }
    if (found_match != null) {
        console.log('   > click occurred within known book cover bounds...')
        var popup_html = '';
        if(found_match[book_series] != 'none') {
            popup_html += `<p style="color:grey; margin-bottom:0rem; font-size:14px;"><b>${found_match[book_series]}</b></p>`;
            popup_html += `<h2 style="margin-top:0rem; padding-top:0.1rem; font-size:24px;">${found_match[book_title]}</h2>`;
        }
        else {
            popup_html += `<h2 font-size:24px;>${found_match[book_title]}</h2>`;
        }
        popup_html += `<p style="font-size:14px; padding-botom:0rem;"><b>By: ${found_match[book_authors]}</b></p>`;
        popup_html += `<div class="book-desc" style="max-height:300px; overflow-y: auto; padding-right:15px; padding-top:0rem;"><p margin-top:0.2rem;">${found_match[book_desc]}</p></div>`;
        var popup = L.popup(click_latlng, {content: popup_html}).openOn(map);
    }
    else {
        console.log('   > click happened outside of book cover bounds')
    }
    console.log('   > done!')
}

const display_metadata = async(click_latlng) => {
    const xy = L.CRS.Simple.latLngToPoint(click_latlng, 11);
    
    // lazy r-tree
    const block_x = Math.floor(xy.x / 1024);
    const block_y = Math.floor(xy.y / 1024);
    console.log(`   > r-tree block: ${block_x}/${block_y}`);
    const block_key = `${block_x}-${block_y}`;

    // reduce http calls by checking metadata cache first
    console.log('   > checking metadata cache...');
    if (metadata_cache.has(block_key)) {
        console.log('      > found match');
        parse_block(metadata_cache.get(block_key), xy, click_latlng);
    }
    else {
        console.log('      > no match found...')
        console.log('   > fetching block...');
        //const res = await fetch(`metadata/blocks/${block_x}/${block_y}.txt`, {
        const res = await fetch(`https://visual-book-recommender-v1.s3.amazonaws.com/blocks/${block_x}/${block_y}.csv`, {
            method: 'get',
            headers: {'content-type': 'text/csv;charset=UTF-8',}
        });
        if (res.status == 200) {
            // add new metadata block to cache
            const csv_data = await res.text();
            metadata_cache.set(block_key, csv_data.split("\n"));
            parse_block(metadata_cache.get(block_key), xy, click_latlng);

            // trim down cache if needed
            if (metadata_cache.size >= 10) {
                metadata_cache.delete(metadata_cache.keys().next().value);
            }
        }
        else if (res.status == 404) {
            console.log('> no books present within current block');
        }
        else {
            console.log(`Failed to load metadata block. Error code: ${res.status}`);
        }
    }
}

map.on('click', function(e){
    const xy = L.CRS.Simple.latLngToPoint(e.latlng, 11);
    const z  = map.getZoom();
    console.log(`> click event detected at: x=${xy.x}, y=${xy.y}, z=${z}`);
    if (z > 8) {
        display_metadata(e.latlng);
    }
});

const reveal_search = () => {
    var x = document.getElementById("search-box");
    if (x.style.display === "none") {
        x.style.display = "block";
        search.focus();
    }
    else {
        x.style.display = "none";
        suggestions.style.display = "none";
        search.value = '';
    }
}

const parse_csv = (data) => {
    const [book_titles, book_x, book_y] = [[], [], []];
    const rows = data.split("\n");
    for (let i=0; i<rows.length; i++) {
        const [_title, _x, _y] = rows[i].split('|');
        book_titles.push(_title);
        book_x.push(parseInt(_x));
        book_y.push(parseInt(_y));
    }
    return [book_titles, book_x, book_y]
}

const reset_autocomplete = () => {
    console.log('reset auto complete...');
    suggestions.innerHTML = '';
    search.value = '';
}

const flyto_xy = (x, y) => {
    console.log('book xy:', x, y);
    xy = map.unproject(L.point(x, y), 11);
    console.log('projected xy:',xy.lng, xy.lat);
    reset_autocomplete();
    reveal_search();
    map.flyTo([xy.lat, xy.lng], 11, {animate: true, duration: 3 });
}

const run_autocomplete = (haystack, book_x, book_y) => {
    const uf = new uFuzzy({"intraIns":1});
    const min_query_len = 2;

    document.onkeydown = function(evt) {
        evt = evt || window.event;
        if (evt.keyCode == 27) {
            if (suggestions != '') {
                reset_autocomplete();
                reveal_search();
            }
        }
    };

    document.getElementById("search").addEventListener('input', e => {
        let needle = e.target.value;
        let innerHTML = '';
        const mark = (part, matched) => matched ? '<b>' + part + '</b>' : part;

        if (needle.length < min_query_len) {
            suggestions.innerHTML = '';
            suggestions.style.display = "none";
        }

        if (needle.length >= min_query_len) {
            // get fuzzy search results
            let idxs  = uf.filter(haystack, needle);
            let info  = uf.info(idxs, haystack, needle);
            let order = uf.sort(info, haystack, needle);

            // generate autocomplete results
            if (order.length > 0) {
                for (let i = 0; i < Math.min(order.length, 25); i++) {
                    let infoIdx = order[i];
                    innerHTML += '<li ref="javascript:void(0);" onclick="flyto_xy('+ book_x[info.idx[infoIdx]] + ',' + book_y[info.idx[infoIdx]] + ')">' + uFuzzy.highlight(
                        haystack[info.idx[infoIdx]],
                        info.ranges[infoIdx],
                        mark,
                    ) + '</li>';
                }
                suggestions.style.display = "block";
                suggestions.innerHTML = innerHTML;
            }
            else {
                console.log('> no results...');
                suggestions.style.display = "none";
                suggestions.innerHTML = '';
            }
        }
    });
}

const main = async() => {
    const res = await fetch('autocomplete.csv', {
        method: 'get',
        headers: {
            'content-type': 'text/csv;charset=UTF-8',
        }
    });

    if (res.status == 200) {
        const csv_data = await res.text();
        const [book_titles, book_x, book_y] = parse_csv(csv_data);
        console.log('successfully loaded and parsed book details csv file...')
        run_autocomplete(book_titles, book_x, book_y);
    }
    else {
        console.log(`Failed to load book details csv file. Error code: ${res.status}`);
    }
}

main();
