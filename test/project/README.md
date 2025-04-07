# MQTT Temperature Client

## Overview
This Python application connects to an MQTT broker to send temperature data following the AsyncAPI 3.0.0 specification. It's designed for IoT systems that need to report temperature measurements reliably.

## Key Features
- **AsyncAPI 3.0.0 compliant** - Follows strict schema requirements
- **Multiple operation modes**:
  - Send single temperature readings
  - Simulate continuous measurements
- **Automatic reconnection** - Handles network issues gracefully
- **Detailed logging** - Records all activities for troubleshooting

## Installation

### Requirements
- Python 3.8 or higher
- MQTT broker (test.mosquitto.org used by default)

### Dependencies

- Install dependencies:
   ```bash
   pip install paho-mqtt
   ```

## Usage

### Basic Commands
- Send a single temperature reading:
  ```bash
  python client.py --temperature 23.5
  ```

- Start temperature simulation (random values):
  ```bash
  python client.py --simulate
  ```

### Advanced Options
| Option        | Description                          | Default Value       |
|---------------|--------------------------------------|---------------------|
| `--host`      | MQTT broker address                  | test.mosquitto.org  |
| `--port`      | MQTT broker port                     | 1883                |
| `--interval`  | Seconds between simulated readings   | 5                   |

Example with custom broker:
```bash
python client.py --host localhost --port 1883 --temperature 21.5
```

## Configuration
The client follows these specifications by default:
- Topic: `temperature/changed`
- Message format:
  ```json
  {
    "temperatureId": "temp-XXXXX",
    "value": 22.5
  }
  ```
- Temperature IDs match pattern: `temp-[a-zA-Z0-9]{5}`

## Troubleshooting
Common issues and solutions:

1. **Connection problems**:
   - Verify broker address and port
   - Check firewall settings

2. **Validation errors**:
   - Ensure temperature values are numbers
   - Don't modify the temperature ID format

Logs are saved in `temperature_client.log` for detailed error analysis.
