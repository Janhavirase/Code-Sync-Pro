import fetch from 'node-fetch';

async function test() {
    try {
        const res = await fetch("https://huggingface.co/Xenova/whisper-tiny/resolve/main/tokenizer_config.json");
        console.log("Status:", res.status);
    } catch (e) {
        console.error("Connection failed:", e);
    }
}
test();