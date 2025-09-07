import React from 'react';

// Aspect Ratios for UI
export const ASPECT_RATIOS = ['11:6', '16:9', '3:2', '4:3', '1:1', '3:4', '2:3', '9:16', '6:11'] as const;

// Aspect Ratios supported directly by the Imagen API
export const API_SUPPORTED_ASPECT_RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9"];

// Example prompts for the initial screen
export const EXAMPLE_PROMPTS = [
    '一隻可愛的貓咪太空人，漂浮在銀河中',
    '一座未來城市的霓虹燈夜景，賽博龐克風格',
    '一幅梵高風格的向日葵星夜畫',
    '一座維多利亞時代的豪宅，住著傳說中的吸血鬼',
    '一位身穿盔甲的女騎士，站在山頂上',
    '一個廢棄的太空站，被外星人佔領',
    '一片超現實的沙漠景觀，瘋狂麥斯車隊正在追逐',
    '一個舒適的書房，窗外下著雨',
];

// For "Inspire Me" feature
export const SUBJECTS = ['一隻貓', '一位機器人', '一位巫師', '一位太空人', '一條龍', '一位偵探'];
export const BACKGROUNDS = ['一座繁華的未來城市', '一片寧靜的魔法森林', '一個廢棄的太空站', '一座維多利亞時代的豪宅', '一片超現實的沙漠景觀'];
export const ACTIONS_POSES = ['正在閱讀一本古老的書', '正在喝咖啡', '正在凝視遠方', '正在跳舞', '正在修理一個複雜的裝置'];
export const EMOTIONS = ['快樂的', '沉思的', '神秘的', '勇敢的', '悲傷的'];
export const CLOTHING = ['現代時尚服裝', '中世紀盔甲', '賽博龐克外套', '優雅的長袍', '蒸汽龐克風格的服飾'];
export const DETAILS_OBJECTS = ['發光的植物', '漂浮的水晶', '古老的時鐘', '未來派的小工具', '一群蝴蝶'];
export const ART_STYLES = ['梵高風格', '達利超現實主義', '日本浮世繪風格', '賽博龐克藝術', '吉卜力工作室動畫風格'];
export const LIGHTING = ['柔和的晨光', '霓虹燈光', '戲劇性的倫勃朗光', '溫暖的燭光', '月光'];
export const COMPOSITIONS = ['對稱構圖', '黃金比例構圖', '特寫鏡頭', '廣角鏡頭', '鳥瞰視角'];
export const TONES_TEXTURES = ['溫暖的色調', '冷酷的藍色調', '高對比度的黑白', '柔和的粉彩色', '粗糙的油畫質感'];

// Function buttons for quick prompt additions
export const FUNCTION_BUTTONS = [
    { label: '公仔手辦', prompt: '4K, create a 1/7 scale commercialized figure of the character, in a realistic style and environment. Place the figure on a computer desk, using a circular transparent acrylic base without any text. On the computer screen, display the ZBrush modeling process of the figure. Next to the computer screen, place a BANDAI-style toy packaging box printed with the original artwork' },
    { label: '三視圖', prompt: 'character design sheet, orthographic view, front view, side view, back view, T-pose, detailed, clean line art, white background' },
    { label: '3D紙雕', prompt: '3D sculpted paper art, layered paper, intricate papercraft, quilling, detailed, delicate lighting' },
    { label: '比例參考圖', prompt: '將生成內容重新繪製到灰色參考圖上，如有空白加入符合內容的outpaint以適合灰色參考圖的寬高比，完全佔滿取代灰色參考圖的所有內容(包含底色背景)，僅保留灰色參考圖的寬高比' },
    { label: '移除文字', prompt: 'remove all text, subtitles, and logos from the image' },
    { label: '更換背景', prompt: 'change the background to [在此填寫背景], keep the subject' },
    { label: '線稿提取', prompt: 'extract the line art from this image, clean white background' },
    { label: '向量圖標', prompt: 'convert this into a clean, simple, flat 2D vector icon' },
    { label: '黏土模型', prompt: 'claymation style, plasticine model, stop-motion animation look' },
    { label: '像素藝術', prompt: 'pixel art, 16-bit, retro video game style' },
    { label: '雙重曝光', prompt: 'double exposure effect with a silhouette of a person and a forest scene' },
    { label: '低多邊形', prompt: 'low poly art style, geometric, faceted' },
    { label: '黑白素描', prompt: 'black and white pencil sketch, detailed shading' },
    { label: '產品攝影', prompt: 'commercial product photography, clean studio background, professional lighting' },
    { label: '開箱照', prompt: 'Knolling photography, objects arranged neatly at 90-degree angles, flat lay, top-down view, clean studio lighting on a flat surface, organized, hyper-detailed, photorealistic' },
    { label: '等距可愛', prompt: 'Isometric 3D cute art, miniature diorama, soft pastel colors, clay-like texture, clean studio lighting, detailed, high quality' },
    { label: '電影感', prompt: 'cinematic lighting, dramatic, movie still' },
    { label: '吉卜力風格', prompt: 'ghibli studio style, anime, beautiful scenery' },
];

// Art styles for the accordion - Expanded to over 100
export const ART_STYLES_LIST = [
    // --- Modern Art Movements ---
    { en: 'Impressionism', zh: '印象派' },
    { en: 'Post-Impressionism', zh: '後印象派' },
    { en: 'Expressionism', zh: '表現主義' },
    { en: 'Cubism', zh: '立體主義' },
    { en: 'Surrealism', zh: '超現實主義' },
    { en: 'Abstract Expressionism', zh: '抽象表現主義' },
    { en: 'Pop Art', zh: '普普藝術' },
    { en: 'Minimalism', zh: '極簡主義' },
    { en: 'Futurism', zh: '未來主義' },
    { en: 'Dadaism', zh: '達達主義' },
    { en: 'Constructivism', zh: '構成主義' },
    { en: 'Fauvism', zh: '野獸派' },
    { en: 'Art Nouveau', zh: '新藝術運動' },
    { en: 'Art Deco', zh: '裝飾藝術' },
    { en: 'Bauhaus', zh: '包浩斯' },
    { en: 'Op Art', zh: '歐普藝術' },
    { en: 'Kinetic Art', zh: '動態藝術' },
    // --- Classical & Historical ---
    { en: 'Renaissance', zh: '文藝復興' },
    { en: 'Baroque', zh: '巴洛克' },
    { en: 'Rococo', zh: '洛可可' },
    { en: 'Neoclassicism', zh: '新古典主義' },
    { en: 'Romanticism', zh: '浪漫主義' },
    { en: 'Realism', zh: '現實主義' },
    { en: 'Gothic Art', zh: '哥德藝術' },
    { en: 'Byzantine Art', zh: '拜占庭藝術' },
    { en: 'Pre-Raphaelite', zh: '前拉斐爾派' },
    // --- Digital & Contemporary ---
    { en: 'Cyberpunk', zh: '賽博龐克' },
    { en: 'Steampunk', zh: '蒸汽龐克' },
    { en: 'Solarpunk', zh: '太陽龐克' },
    { en: 'Vaporwave', zh: '蒸汽波' },
    { en: 'Glitch Art', zh: '故障藝術' },
    { en: 'Pixel Art', zh: '像素藝術' },
    { en: 'Voxel Art', zh: '體素藝術' },
    { en: 'Low Poly', zh: '低多邊形' },
    { en: 'Fractal Art', zh: '碎形藝術' },
    { en: 'Generative Art', zh: '生成藝術' },
    { en: 'Digital Painting', zh: '數位繪畫' },
    { en: 'Concept Art', zh: '概念藝術' },
    { en: 'Matte Painting', zh: '霧面繪畫' },
    { en: 'Photobashing', zh: '照片拼貼' },
    { en: 'Synthwave', zh: '合成波' },
    { en: 'Holographic', zh: '全息影像' },
    // --- Illustration & Graphic Styles ---
    { en: 'Anime Style', zh: '日本動畫' },
    { en: 'Manga Style', zh: '日本漫畫' },
    { en: 'Ghibli Studio Style', zh: '吉卜力風格' },
    { en: 'Disney Style', zh: '迪士尼風格' },
    { en: 'Cartoon Style', zh: '卡通風格' },
    { en: 'Comic Book Art', zh: '美式漫畫' },
    { en: 'Flat Design', zh: '扁平化設計' },
    { en: 'Vector Art', zh: '向量藝術' },
    { en: 'Infographic Style', zh: '資訊圖表' },
    { en: 'Psychedelic Art', zh: '迷幻藝術' },
    { en: 'Vintage Poster', zh: '復古海報' },
    { en: 'Fantasy Art', zh: '奇幻藝術' },
    { en: 'Sci-Fi Art', zh: '科幻藝術' },
    { en: 'Children\'s Book Illustration', zh: '童書插畫' },
    // --- Cultural & Regional Styles ---
    { en: 'Ukiyo-e', zh: '浮世繪' },
    { en: 'Sumi-e (Ink Wash Painting)', zh: '水墨畫' },
    { en: 'Chinese Painting (Guohua)', zh: '國畫' },
    { en: 'Aboriginal Art', zh: '澳洲原住民藝術' },
    { en: 'African Art', zh: '非洲藝術' },
    { en: 'Islamic Art', zh: '伊斯蘭藝術' },
    { en: 'Mandala', zh: '曼陀羅' },
    { en: 'Celtic Knotwork', zh: '凱爾特結' },
    { en: 'Mayan Art', zh: '馬雅藝術' },
    { en: 'Tibetan Thangka', zh: '西藏唐卡' },
    // --- Technique-Based Styles ---
    { en: 'Oil Painting', zh: '油畫' },
    { en: 'Watercolor Painting', zh: '水彩畫' },
    { en: 'Acrylic Painting', zh: '壓克力畫' },
    { en: 'Pencil Sketch', zh: '鉛筆素描' },
    { en: 'Charcoal Drawing', zh: '炭筆素描' },
    { en: 'Ink Drawing', zh: '鋼筆畫' },
    { en: 'Pointillism', zh: '點描法' },
    { en: 'Collage', zh: '拼貼藝術' },
    { en: 'Photorealism', zh: '相片寫實主義' },
    { en: 'Hyperrealism', zh: '超寫實主義' },
    { en: 'Trompe-l\'œil', zh: '錯視畫' },
    { en: 'Graffiti Art', zh: '塗鴉藝術' },
    { en: 'Street Art', zh: '街頭藝術' },
    { en: 'Impasto', zh: '厚塗法' },
    { en: 'Line Art', zh: '線稿藝術' },
    { en: 'Doodle Art', zh: '塗鴉畫' },
    { en: 'Double Exposure', zh: '雙重曝光' },
    { en: 'Light Painting', zh: '光繪' },
    // --- 3D & Sculptural Styles ---
    { en: 'Claymation', zh: '黏土動畫' },
    { en: 'Origami', zh: '摺紙藝術' },
    { en: 'Papercraft (Kirigami)', zh: '紙雕藝術' },
    { en: 'Quilling', zh: '衍紙' },
    { en: 'Stained Glass', zh: '彩繪玻璃' },
    { en: 'Mosaic', zh: '馬賽克' },
    { en: 'Lego Bricks', zh: '樂高積木' },
    { en: '3D Render', zh: '3D渲染' },
    { en: 'Octane Render', zh: 'Octane渲染' },
    { en: 'Unreal Engine', zh: '虛幻引擎' },
    { en: 'Blender Render', zh: 'Blender渲染' },
    // --- Photographic Styles ---
    { en: 'Cinematic', zh: '電影感' },
    { en: 'Film Noir', zh: '黑色電影' },
    { en: 'Long Exposure', zh: '長曝光' },
    { en: 'Monochrome', zh: '單色攝影' },
    { en: 'Sepia', zh: '懷舊褐色' },
    { en: 'Macro Photography', zh: '微距攝影' },
    { en: 'Tilt-Shift', zh: '移軸攝影' },
    { en: 'Lomography', zh: 'LOMO風格' },
];

// Editing examples for the accordion - Restored and expanded as per user request
export const EDITING_EXAMPLES = [
    {
        category: 'I. 個人化與風格轉換',
        examples: [
            { title: '人物外觀改造', prompt: '將我的T恤換成黑色燕尾服，並加上一頭金色長髮。' },
            { title: '場景置換與融合', prompt: '把我從這張室內照中取出，放到一個豪華遊艇的甲板上。' },
            { title: '人物增減與互動', prompt: '在我的照片旁加入一位金髮美女，讓她和我一起拿著雞尾酒。' },
            { title: '名人虛擬合影', prompt: '把我跟 Jeff Bezos 和 Taylor Swift 放在同一艘遊艇上合照。' },
            { title: '卡通與動畫風格化', prompt: '把我變成一個《南方四賤客》（South Park）風格的角色。' },
            { title: '電玩遊戲角色化', prompt: '把我變成一個《俠盜獵車手5》（GTA V）風格的人物，走在街上。' },
            { title: '藝術媒介風格轉換', prompt: '把我變成一個在森林裡散步的黏土動畫角色。' },
            { title: '寵物擬人/奇幻化', prompt: '展示我的狗如果變成人類會是什麼樣子，穿著藍色背心。' },
            { title: '個人化迷因創作', prompt: '使用 Drake 迷因範本，但把 Drake 的臉換成我的臉。' },
            { title: '個人化可動人偶', prompt: '把我做成一個包裝好的玩具公仔，系列名稱是『灰熊哥』。' },
            { title: '名家畫作風格化', prompt: '將一張貓的照片，轉換成梵谷《星夜》風格的畫作。' }
        ]
    },
    {
        category: 'II. 商業與設計應用',
        examples: [
            { title: 'Logo轉為產品模型', prompt: '使用這個Futurepedia的Logo，設計一款時尚的能量飲料罐。' },
            { title: '產品情境廣告生成', prompt: '生成一張滑雪者在空中拿著『FutureFuel』能量飲料的極限運動照片。' },
            { title: '產品置入行銷', prompt: '將照片中人物手中的飲料，替換成我們的『FutureFuel』能量飲料罐。' },
            { title: '數據視覺化圖表', prompt: '創建一個線形圖，展示『FutureFuel』對生產力的影響。' },
            { title: '網頁/App介面設計', prompt: '為『FutureFuel』設計一個網頁登陸頁面（Landing Page）的視覺稿。' },
            { title: '品牌視覺資產設計', prompt: '根據產品罐上的字體風格，創建一個完整的字母表和數字。' },
            { title: '產品重新設計/概念化', prompt: '以『未來主義』為主題，重新設計這款運動鞋。' },
            { title: '產品材質替換', prompt: '將這張金屬手錶的照片，材質更換為木質。' },
            { title: '室內設計預覽', prompt: '在這間臥室裡，將這面牆換成綠色植物圖案的壁紙。' },
            { title: '建築外觀改造', prompt: '將這棟磚牆建築的外觀，改造成現代風格的玻璃帷幕大樓。' },
            { title: '虛擬居家陳設', prompt: '為這個空房間佈置上北歐風格的家具和暖色調燈光。' }
        ]
    },
    {
        category: 'III. 創意敘事與內容生成',
        examples: [
            { title: '角色跨場景一致性', prompt: '讓這兩位動漫角色保持不變，但將背景從白天市場換成夜晚的街景。' },
            { title: '多角度鏡頭生成', prompt: '顯示同一個市場場景，但從俯瞰的鳥瞰視角拍攝。' },
            { title: '角色情緒表情網格', prompt: '為畫面中的貓咪創建一個3x2的網格，展示它不同的情緒。' },
            { title: '插入/特寫鏡頭', prompt: '給我一個手正在拿起一顆蘋果的特寫鏡頭。' },
            { title: '場景擴展', prompt: '將這張市場的圖片向外擴展，展示更寬闊的街景。' },
            { title: '故事板/漫畫面板創作', prompt: '使用這些角色創建一個四格漫畫，顯示他們之間的有趣對話。' }
        ]
    },
    {
        category: 'IV. 智慧修圖與照片修復',
        examples: [
            { title: '智慧物件移除', prompt: '移除這張海灘照片中所有的人物和陽傘。' },
            { title: '環境元素增減', prompt: '在照片的地面上添加一層薄雪，並在天空中加入極光。' },
            { title: '季節與時間變換', prompt: '將這張夜景照片轉換成白天晴朗的樣子。' },
            { title: '色彩校正與風格化', prompt: '修正這張曝光不足、顏色偏藍的照片，讓它看起來更自然。' },
            { title: '歷史照片修復與上色', prompt: '修復這張有摺痕的舊照片，並為其添加色彩。' },
            { title: '局部細節精修', prompt: '移除麋鹿鹿角上的茸毛，讓它看起來像秋季的硬化鹿角。' },
            { title: '選擇性編輯', prompt: '將樹葉變成秋天的顏色，但保持地面上的草地是綠色的。' },
            { title: '風格化文字添加', prompt: '在圖片上方用符合極光氛圍的酷炫字體加上『AURORA』這個詞。' },
            { title: '圖像品質提升', prompt: '讓這張輕微失焦的照片變得更清晰。' }
        ]
    },
    {
        category: 'V. 概念與維度轉換',
        examples: [
            { title: '2D草圖轉3D擬真圖像', prompt: '將這張筆記本上的怪物素描，轉換成一張逼真的3D渲染圖。' },
            { title: '2D地圖轉3D沙盤', prompt: '將這張手繪的奇幻地圖，轉換成一個完整的3D沙盤模型。' },
            { title: '照片轉等角視圖模型', prompt: '從這張街景照片中，單獨分離出這棟建築，並將其轉換為等角視圖模型。' },
            { title: 'CAD圖轉攝影級渲染', prompt: '將這張鋁擠型框架的CAD截圖，渲染成一張具有真實感的攝影棚產品照。' },
            { title: '照片轉功能性線稿', prompt: '將這張我的狗在帳篷裡的照片，變成一張可以列印的黑白著色簿頁面。' },
            { title: '地圖轉實景視角', prompt: '根據這張Google地圖，生成紅色箭頭所指向的視角看到的金門大橋。' },
            { title: '動畫轉真人電影場景', prompt: '將這張《變形金剛》卡通圖片，轉換成一個在綠幕前的真人電影拍攝場景。' },
            { title: '抽象概念具象化', prompt: '創建一張代表『一個坐在辦公室的男人腦中有一個迷宮』的超現實主義圖像。' }
        ]
    }
];

// Options for the new Character Creator mode
export const CHARACTER_CREATOR_SECTIONS = [
    {
        category: '物種',
        options: [
            { label: '人類', prompt: 'human' },
            { label: '精靈', prompt: 'elf, slender, elegant, pointed ears' },
            { label: '矮人', prompt: 'dwarf, stout, bearded, strong' },
            { label: '獸人', prompt: 'orc, muscular, green-skinned, tusks' },
            { label: '機器人', prompt: 'robot, metallic, glowing eyes, futuristic' },
            { label: '半獸人', prompt: 'cat-person, cat ears, tail, agile' },
            { label: '龍裔', prompt: 'dragonkin, scales, horns, draconic features' },
            { label: '不死族', prompt: 'undead, skeletal, ethereal glow' },
        ],
    },
    {
        category: '職業',
        options: [
            { label: '戰士', prompt: 'warrior, plate armor, sword and shield' },
            { label: '法師', prompt: 'mage, robes, staff, casting a spell' },
            { label: '盜賊', prompt: 'rogue, leather armor, daggers, hooded' },
            { label: '遊俠', prompt: 'ranger, bow and arrow, cloak, in a forest' },
            { label: '科學家', prompt: 'scientist, lab coat, futuristic gadgets' },
            { label: '生化人', prompt: 'cyborg, cybernetic implants, high-tech' },
            { label: '武僧', prompt: 'monk, traditional garb, martial arts pose' },
            { label: '祭司', prompt: 'priest, ornate robes, holy symbol, divine light' },
        ],
    },
    {
        category: '外觀特徵',
        options: [
            { label: '金色長髮', prompt: 'long golden hair' },
            { label: '銀色短髮', prompt: 'short silver hair' },
            { label: '發光眼睛', prompt: 'glowing eyes' },
            { label: '臉部刺青', prompt: 'facial tattoos' },
            { label: '機械手臂', prompt: 'cybernetic arm' },
            { label: '尖銳爪子', prompt: 'sharp claws' },
            { label: '傷疤', prompt: 'scar across face' },
            { label: '精緻妝容', prompt: 'intricate makeup' },
        ],
    },
    {
        category: '服裝',
        options: [
            { label: '華麗鎧甲', prompt: 'ornate plate armor' },
            { label: '飄逸法袍', prompt: 'flowing wizard robes' },
            { label: '未來感戰衣', prompt: 'futuristic jumpsuit' },
            { label: '蒸汽龐克服', prompt: 'steampunk attire, gears and goggles' },
            { label: '和服', prompt: 'traditional kimono' },
            { label: '皮夾克', prompt: 'leather jacket, cyberpunk style' },
            { label: '破損披風', prompt: 'tattered cloak' },
            { label: '優雅禮服', prompt: 'elegant ball gown' },
        ],
    },
    {
        category: '配件',
        options: [
            { label: '魔法杖', prompt: 'holding a glowing magic staff' },
            { label: '電漿步槍', prompt: 'wielding a plasma rifle' },
            { label: '全息地圖', prompt: 'looking at a holographic map' },
            { label: '飛行無人機', prompt: 'accompanied by a small drone' },
            { label: '巨大戰錘', prompt: 'carrying a giant warhammer' },
            { label: '古老書典', prompt: 'reading from an ancient tome' },
            { label: '肩上寵物', prompt: 'a small dragon on the shoulder' },
            { label: '發光項鍊', prompt: 'wearing a luminous amulet' },
        ],
    },
];
