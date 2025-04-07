# Python MQTT Client Template  

## Overview  

This template generates a ready-to-use Python MQTT client from your AsyncAPI specification. It automatically creates:  

- A client class with connection handling  
- Message validation based on your schema  
- Logging configuration  
- Sample publishing logic  

The generated code helps applications communicate with MQTT brokers without dealing with low-level details.  

## Technical Requirements  

- [AsyncAPI Generator](https://github.com/asyncapi/generator/) v1.10.0 or later  
- Python 3.6+  
- Paho-MQTT library (manually install)  

## Specification Requirements  

The template uses these parts of your AsyncAPI document:  

| Property | Purpose | Required | Default |  
|----------|---------|----------|---------|  
| `servers` | Broker connection details | Yes | - |  
| `channels` | Topics and message formats | Yes | - |  
| `message.payload` | Validation rules | No | Basic checks |  

## Supported Protocols  

- MQTT (default port 1883)  
- MQTT over WebSocket (ports 80/443)  
- Secure MQTT (port 8883)  

## Installation & Usage  

1. Install the AsyncAPI CLI:  
```bash
npm install -g @asyncapi/cli
```

2. Generate your client:  
```bash
asyncapi generate fromTemplate asyncapi.yml https://github.com/your-repo/python-mqtt-template --output ./client --param server=dev
```

3. Run the client:  
```bash
python3 ./test/project/client.py --temperature 22.5
```

## Testing the Connection  

Subscribe to test messages:  
```bash
mosquitto_sub -h test.mosquitto.org -t "temperature/changed"
```

Publish test messages:  
```bash
mosquitto_pub -h test.mosquitto.org -t "temperature/changed" -m '{"temperatureId":"temp-12345","value":22.5}'
```

## Configuration Options  

Pass these parameters during generation:  

| Parameter | Description | Example |  
|-----------|-------------|---------|  
| `server` | Broker configuration to use | `production` |  
| `qos` | Default message quality level | `1` |  

## Development  

Run tests:  
```bash
npm test
```

Debug template issues:  
```bash
npm run test:debug
```

Key files:  
- `template/` - Generation logic  
- `test/` - Example specifications and tests  

## Need Help?  

Open an issue if you encounter problems with:  
- Message validation  
- Connection errors  
- Template generation
