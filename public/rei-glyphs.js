(()=>{'use strict';
// Exact source glyph cells, read from the original 1200 × 1200 ASCII artwork.
// Copying its own 8 × 12 glyphs preserves the typeface, ink and character lattice.
const cell={width:8,height:12};
const atlas={' ':[0,0],'#':[98,20],'+':[134,1],'-':[56,1],'/':[81,5],'\\':[76,2]};
// Viewer-left: only the three exposed columns; the foreground fringe is excluded.
const eyes=[{name:'left',column:83,row:27,stages:[[],['---'],['+++','---'],['+++','\\--']]},
{name:'right',column:99,row:24,stages:[[],['--------'],['########','--------'],['########','\\------/','########']]}];
function draw(context,source,stage){context.clearRect(0,0,1200,1200);if(!stage)return;context.imageSmoothingEnabled=false;for(const eye of eyes){const rows=eye.stages[stage];for(let r=0;r<rows.length;r++){for(let c=0;c<rows[r].length;c++){const [sx,sy]=atlas[rows[r][c]],x=(eye.column+c)*cell.width,y=(eye.row+r)*cell.height;context.fillStyle='#000';context.fillRect(x,y,cell.width,cell.height);context.drawImage(source,sx*cell.width,sy*cell.height,cell.width,cell.height,x,y,cell.width,cell.height);}}}}
window.ReiGlyphs={draw,eyes,atlas,cell};
})();
