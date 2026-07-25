// ================================================================
        //  THE MUSEUM OF US — Interactive Love Story Museum
        //  An immersive 3D walking experience through memories
        // ================================================================

        // ================================================================
        //  SECTION 1: CONFIGURATION
        //  Adjust these values to customize the museum experience
        // ================================================================
        const CONFIG = {
            // Hallway dimensions
            hallwayLength: 420,
            hallwayWidth: 12,
            hallwayHeight: 8,

            // Camera
            cameraHeight: 2.8,
            cameraFOV: 58,

            // Movement
            walkSpeed: 0.08,
            scrollSensitivity: 0.0025,
            friction: 0.94,
            interpolation: 0.065,

            // Frame placement
            frameSpacing: 16,
            frameStartZ: -12,

            // Atmosphere
            fogDensity: 0.012,
            fogColor: 0xD8CBBB,
            dustCount: 600,

            // Lighting
            ambientIntensity: 0.35,
            spotlightColor: 0xFFF0D6,
            spotlightIntensity: 1.4,
            approachDistance: 18,

            // Performance
            maxPixelRatio: 1.75,
            shadowMapSize: 256,
        };

        // ================================================================
        //  SECTION 2: MEMORIES DATA (JSON-DRIVEN)
        //  ────────────────────────────────────────────────────────────────
        //  TO ADD A NEW MEMORY:
        //  Simply add a new object to this array. The museum will
        //  automatically generate a frame for it.
        //
        //  Fields:
        //    image       — path or URL to image file (required)
        //    video       — path or URL to video file (optional)
        //    title       — displayed on museum label (required)
        //    date        — displayed on museum label (required)
        //    description — shown in detail overlay (optional)
        //    note        — handwritten note on back of frame (optional)
        //    side        — "left" or "right" wall placement
        //    size        — "portrait", "landscape", or "square"
        //                  (auto-detected from image if omitted)
        //    frameStyle  — "classic", "modern", "ornate" (default: "classic")
        // ================================================================
        const memories = [
            {
                            image: "assets//WIN_20250322_12_30_38_Pro.jpg",
                            title: "Eyy Andrea",
                            date: "July 24, 2024",
                            description: "Crush Mko ayy ",
                            note: "I love you",
                            side: "right",
                            size: "landscape",
                            frameStyle: "ornate"
                        },

            {
                            image: "./assets/IMG_20241013_164924.jpg",
                            title: "Lagawww lang",
                            date: "October 13, 2024",
                            description: "Stroll stroll lang kag nag picture picture lang",
                            note: "Enjoying the simple moments with you is my favorite thing. Strolling through the road, hand in hand, I felt like the luckiest person alive.",
                            side: "left",
                            size: "portrait",
                            frameStyle: "classic"
                        },

            {
                            image: "./assets/IMG_20241022_174045.jpg",
                            title: "Fishball Lamon",
                            date: "October 22, 2024",
                            description: " Eat at plaza and lamon lang ka mga cravings ta. I love how we can be silly together.",
                            note: "We talk about our dreams, our fears, and our favorite foods. I love that we can be ourselves around each other.",
                            side: "right",
                            size: "landscape"
                        },

            {
                            image: "./assets/IMG_20241022_173149.jpg",
                            title: "Jaro Plaza Stroll",
                            date: "October 22, 2024",
                            description: "Walking hand in hand through the plaza, the world felt like it had shrunk to just us.",
                            note: "I want to remember this moment forever. I want to remember the way your hand fits perfectly in mine.",
                            side: "left",
                            size: "landscape"
                        },

            {
                            image: "./assets/IMG_20241022_181739.jpg",
                            title: "Street side selfie",
                            date: "October 22, 2024",
                            description: "ma ipit nalang ta ja kaka selfies sa dalan",
                            note: " I want you to be with me all the time",
                            side: "right",
                            size: "portrait"
                        },

            {
                            image: "./assets/IMG_20241106_151638.jpg",
                            title: "HAHAHAHHAAHAHHA",
                            date: "November 06, 2024",
                            description: "ANOJAAA HAHAHAHAHAHAA",
                            note: "Bisan karadlawan pic mo gwapa gyapon",
                            side: "left",
                            size: "square"
                        },

            {
                            image: "./assets/IMG_20241106_171536.jpg",
                            title: "Fiesta sa Sta. Barbara",
                            date: "November 06, 2024",
                            description: "Ma miest taaa, bast aimaw kaw gora",
                            note: "Every time I see you, I fall in love all over again. Even when you're just standing there, doing nothing, you take my breath away.",
                            side: "right",
                            size: "landscape"
                        },

            {
                            image: "./assets/IMG_20241109_170610.jpg",
                            title: "Sm Selfie",
                            date: "November 09, 2024",
                            description: "Taking selfies to past/speed up time.",
                            note: "Slefiee lang bisan ano mangyari atleast dbaa may memories ta nga ma look back later hahahah",
                            side: "left",
                            size: "square"
                        },

            {
                            image: "./assets/MVIMG_20241206_162622.jpg",
                            title: "Gin picture mo or na Pindot lang",
                            date: "December 06, 2024",
                            description: "Epic bahahahahhahaha",
                            note: "Epic man or indi bisan ano man nga picture mo basta imoo nami dayun hahahah",
                            side: "right",
                            size: "square"
                        },

            {
                            image: "./assets/MVIMG_20241206_162714_2.jpg",
                            title: "Selfie With Youu",
                            date: "December 06, 2024",
                            description: "Taking selfie to capture the moment.",
                            note: "hihihi I love youuu ga selfies lang bisan diin",
                            side: "left",
                            size: "square"
                        },

            {
                            image: "./assets/MVIMG_20241221_215517_1.jpg",
                            title: "Randomly sending selfies",
                            date: "December 21, 2024",
                            description: "Ga send kaw randmoly kang Selfies mo and I love that.",
                            note: "I love the way you make me smile even when you're not around. I love the way your selfies make my day brighter.",
                            side: "right",
                            size: "portrait",
                            frameStyle: "ornate"
                        },

            {
                            image: "./assets/MVIMG_20241223_111913.jpg",
                            title: "The Proposal",
                            date: "December 23, 2024",
                            description: "Snow was falling. The park was empty. It was just us and the world held its breath.",
                            note: "I practiced those words for three months. When the moment came, I forgot them all. You said yes anyway.",
                            side: "left",
                            size: "portrait",
                            frameStyle: "ornate"
                        },

            {
                            image: "./assets/MVIMG_20241225_000821.jpg",
                            title: "Luhhhhhhh",
                            date: "December 25, 2024",
                            description: "Gapanakaw pic",
                            note: "Randomly taking selfies is what I love about you. I love the way you make every moment feel special, even the ordinary ones.",
                            side: "right",
                            size: "landscape"
                        },

            {
                            image: "./assets/MVIMG_20241225_011754_2.jpg",
                            title: "Smiling Eyes Part 2",
                            date: "December 25, 2024",
                            description: " Ga himo kita ways para i enjoy ang company kang isat isa.",
                            note: " I love you meii. more moments to come",
                            side: "left",
                            size: "square"
                        },

            {
                            image: "./assets/IMG_20241225_010702.jpg",
                            title: "Smiling Eyes",
                            date: "December 25, 2024",
                            description: "Ka refreshing permi nga makita ang smiling selfies mo hahahahah",
                            note: "I love the way your eyes light up when you smile. I love the way your laugh fills the room. I love you.",
                            side: "right",
                            size: "portrait"
                        },

            {
                            image: "./assets/MVIMG_20241225_011242.jpg",
                            title: "Beautiful Gid hahahha",
                            date: "December 25, 2024",
                            description: "I love you more than words can say. I love you more than the stars love the night sky. I love you more than the ocean loves the shore.",
                            note: "I love youuuuu meiiii",
                            side: "left",
                            size: "landscape"
                        },

            {
                            image: "./assets/MVIMG_20241225_011733.jpg",
                            title: "Christmas Eve",
                            date: "December 25, 2024",
                            description: "Picture picture lang nga du profesional photographer.",
                            note: "I love the way you make every holiday feel magical. I love the way you make every day feel like a celebration.",
                            side: "right",
                            size: "square"
                        },

            {
                            image: "./assets/MVIMG_20250209_141816.jpg",
                            title: "Cuddle Time",
                            date: "February 09, 2025",
                            description: "Just us, wrapped in blankets, the world outside forgotten.",
                            note: "I love the way you fit perfectly against me. I love the way your warmth makes the coldest days feel like summer.",
                            side: "left",
                            size: "portrait"
                        },

            {
                            image: "./assets/IMG_20250301_155524.jpg",
                            title: "Lutu-Lutu",
                            date: "March 01, 2025",
                            description: "Cooking gyapon imaw kaw",
                            note: "I love the way you make even the simplest meals feel like a feast. I love cooking with you.",
                            side: "right",
                            size: "portrait"
                        },

            {
                            image: "./assets/IMG_20250301_154804.jpg",
                            title: "Close up Picture ni Andrea",
                            date: "March 01, 2025",
                            description: "Cute Cute pa picture",
                            note: "I love the way your eyes light up when you smile. I love the way your laugh fills the room. I love you.",
                            side: "left",
                            size: "landscape"
                        },

            {
                            image: "./assets/IMG_20250301_155204.jpg",
                            title: "Sa Boarding House",
                            date: "March 01, 2025",
                            description: "Tambay Raha raha kang mga fries kag dapli",
                            note: "Cooking with you makes every meal taste better. Even the burnt ones.",
                            side: "right",
                            size: "square"
                        },

            {
                            image: "./assets/IMG_20250501_202300.jpg",
                            title: "Tubong-Tubong Festival",
                            date: "May 01, 2025",
                            description: "Watching kang events sa banwa",
                            note: "Its much better to celebrate with you than to celebrate alone. You make every festival brighter.",
                            side: "left",
                            size: "portrait"
                        },

            {
                            image: "./assets/IMG_20250601_203744.jpg",
                            title: "Random Pic",
                            date: "June 01, 2025",
                            description: "Picture lang sa sulod balay nyo",
                            note: "Still enjoying the little moments with you. Every day is an adventure.",
                            side: "right",
                            size: "landscape"
                        },

            {
                            image: "./assets/IMG_20260617_083748.jpg",
                            title: "Lingoob",
                            date: "June 17, 2026",
                            description: "Mga kapira mo mag relamo nga kakapoy mag panaw. Pero bisan pa man, nag enjoy ta sa atong adventure. Ang mga memories nga ato na himo di ko gid malipatan.",
                            note: "Hugging you in the cold morning air, I felt like the luckiest person alive. I never want to let go.",
                            side: "left",
                            size: "landscape"
                        },
                ];

        // ================================================================
        //  SECTION 3: DOM REFERENCES
        // ================================================================