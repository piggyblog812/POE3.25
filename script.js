// 宣告全域變數與常數
const ROWS = 7;
const COLS = 6;
const CELL_SIZE = 40;

// 預設的禁用格子 (用 "r,c" 的字串表示)
let forbiddenCells = new Set([
    "0,0", "2,1", "3,1", "4,1", "3,2",
    "3,3", "2,4", "3,4", "4,4", "6,5"
]);

// 物品形狀：型態對應 [高度, 寬度]
const ITEM_SHAPES = {
    "1x1": [1, 1],
    "1x2": [2, 1],
    "1x3": [3, 1],
    "2x1": [1, 2],
    "3x1": [1, 3],
    "2x2": [2, 2]
};

// 顏色列表 (用來依據物品 id 上色)
const COLORS = ["red", "blue", "green", "yellow", "purple", "orange", "pink"];

/*------------------------------------------------
  畫出初始網格（包含禁用格子，使用灰色表示）
------------------------------------------------*/
function drawInitialGrid() {
    const canvas = document.getElementById("gridCanvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const x = c * CELL_SIZE;
            const y = r * CELL_SIZE;
            ctx.strokeStyle = "black";
            ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
            // 若該格為禁用區域則填上灰色
            if (forbiddenCells.has(`${r},${c}`)) {
                ctx.fillStyle = "gray";
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            }
        }
    }
}

/*------------------------------------------------
  畫出最終擺放結果的網格
------------------------------------------------*/
function drawFinalGrid(grid) {
    const canvas = document.getElementById("gridCanvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const x = c * CELL_SIZE;
            const y = r * CELL_SIZE;
            ctx.strokeStyle = "black";
            ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
            if (grid[r][c] === -1) {
                ctx.fillStyle = "gray";
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            } else if (grid[r][c] > 0) {
                const color = COLORS[grid[r][c] % COLORS.length];
                ctx.fillStyle = color;
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                ctx.fillStyle = "black";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(grid[r][c], x + CELL_SIZE / 2, y + CELL_SIZE / 2);
            }
        }
    }
}

/*------------------------------------------------
  取得使用者輸入的物品數量
------------------------------------------------*/
function getItemQuantities() {
    const itemQuantities = {};
    for (const type in ITEM_SHAPES) {
        const input = document.getElementById("item_" + type);
        if (input) {
            let value = parseInt(input.value);
            if (isNaN(value) || value < 0) {
                alert(`請輸入 ${type} 的正確數量！`);
                return null;
            }
            itemQuantities[type] = value;
        }
    }
    return itemQuantities;
}

/*------------------------------------------------
  計算最佳物品擺放方式（回溯法，與原始 Python 邏輯一致）
------------------------------------------------*/
function calculatePlacement() {
    const itemQuantities = getItemQuantities();
    if (itemQuantities === null) {
        return;
    }

    // 建立 grid，初始化為 0
    const grid = [];
    for (let r = 0; r < ROWS; r++) {
        grid.push(Array(COLS).fill(0));
    }
    // 先標記禁用區域 (填入 -1)
    forbiddenCells.forEach(cellStr => {
        const [r, c] = cellStr.split(",").map(Number);
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
            grid[r][c] = -1;
        }
    });

    // 構造物品列表，依物品面積由大到小排序（優先放大物品）
    let items = [];
    let itemId = 1;
    const sortedTypes = Object.entries(itemQuantities).sort((a, b) => {
        const areaA = ITEM_SHAPES[a[0]][0] * ITEM_SHAPES[a[0]][1];
        const areaB = ITEM_SHAPES[b[0]][0] * ITEM_SHAPES[b[0]][1];
        return areaB - areaA;
    });
    for (const [type, qty] of sortedTypes) {
        const [h, w] = ITEM_SHAPES[type];
        for (let i = 0; i < qty; i++) {
            items.push({ id: itemId, type: type, h: h, w: w });
            itemId++;
        }
    }

    // 檢查可用空間
    let availableSpace = 0;
    for (const row of grid) {
        for (const cell of row) {
            if (cell === 0) availableSpace++;
        }
    }
    const requiredSpace = items.reduce((sum, item) => sum + item.h * item.w, 0);
    if (requiredSpace > availableSpace) {
        alert("物品總面積超過可用空間，無法放置！");
        return;
    }

    let placements = [];

    // 檢查該物品能否放置於 (r, c)
    function canPlace(item, r, c) {
        const h = item.h, w = item.w;
        if (r + h > ROWS || c + w > COLS) return false;
        for (let i = 0; i < h; i++) {
            for (let j = 0; j < w; j++) {
                if (grid[r + i][c + j] !== 0) {
                    return false;
                }
            }
        }
        return true;
    }

    // 放置物品 (將 grid 中該區域標記為物品 id)
    function placeItem(item, r, c) {
        const h = item.h, w = item.w;
        for (let i = 0; i < h; i++) {
            for (let j = 0; j < w; j++) {
                grid[r + i][c + j] = item.id;
            }
        }
    }

    // 移除物品 (重置 grid 區域為 0)
    function removeItem(item, r, c) {
        const h = item.h, w = item.w;
        for (let i = 0; i < h; i++) {
            for (let j = 0; j < w; j++) {
                grid[r + i][c + j] = 0;
            }
        }
    }

    // 回溯法尋找擺放方式
    function backtrack(idx) {
        if (idx === items.length) {
            return true;
        }
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (grid[r][c] === 0) {
                    const item = items[idx];
                    if (canPlace(item, r, c)) {
                        placeItem(item, r, c);
                        placements.push([item.id, item.type, r, c]);
                        if (backtrack(idx + 1)) {
                            return true;
                        }
                        removeItem(item, r, c);
                        placements.pop();
                    }
                }
            }
        }
        return false;
    }

    if (!backtrack(0)) {
        alert("無法找到適合的擺放方式！");
        return;
    }

    drawFinalGrid(grid);
}

/*------------------------------------------------
  當使用者點擊 Canvas 時，切換該格的禁用狀態
------------------------------------------------*/
function handleCanvasClick(event) {
    const canvas = event.target;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
        const key = `${row},${col}`;
        if (forbiddenCells.has(key)) {
            forbiddenCells.delete(key);
        } else {
            forbiddenCells.add(key);
        }
        // 每次點擊後重畫初始網格
        drawInitialGrid();
    }
}

/*------------------------------------------------
  清除所有輸入並重置網格與禁用狀態
------------------------------------------------*/
function clearInputs() {
    for (const type in ITEM_SHAPES) {
        const input = document.getElementById("item_" + type);
        if (input) {
            input.value = "0";
        }
    }
    // 重置禁用格子為預設狀態
    forbiddenCells = new Set([
        "0,0", "2,1", "3,1", "4,1", "3,2",
        "3,3", "2,4", "3,4", "4,4", "6,5"
    ]);
    const canvas = document.getElementById("gridCanvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawInitialGrid();
}

/*------------------------------------------------
  初始化：在 DOMContentLoaded 時畫出初始網格，
  並為 Canvas 新增點擊事件監聽器
------------------------------------------------*/
document.addEventListener("DOMContentLoaded", function () {
    drawInitialGrid();
    const canvas = document.getElementById("gridCanvas");
    canvas.addEventListener("click", handleCanvasClick);
});
