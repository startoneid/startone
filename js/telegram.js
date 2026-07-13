const WORKER_URL = "https://startone-notification.startone-id.workers.dev";

export async function sendTelegramNotification(data) {

    try {

        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        console.log("Telegram:", result);

        return result;

    } catch (err) {

        console.error("Telegram Error:", err);

        return {
            success: false,
            error: err.message
        };

    }

}