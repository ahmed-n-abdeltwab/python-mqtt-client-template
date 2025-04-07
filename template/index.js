import { File, Logger } from '@asyncapi/generator-react-sdk';

function generateHeader(asyncapi, params = {}) {
  try {
    // Safely get document info
    const title = asyncapi?.info()?.title() ?? 'Untitled Specification';
    const version = asyncapi?.info()?.version() ?? '0.0.0';

    const { hostname, port, protocol } = getServerConfig(asyncapi, params);
    

    return `"""
AsyncAPI MQTT Client
Generated from: ${title} v${version}
Broker: ${protocol}://${hostname}:${port}
"""
`;
  } catch (error) {
    // Fallback header if anything fails
    return `"""
AsyncAPI MQTT Client
[Error generating header: ${error.message}]
"""
`;
  }
}

function generateImports() {
  return `
import json
import logging
import paho.mqtt.client as mqtt
import re
import uuid
import random
import argparse
from time import sleep
from typing import Optional, Union
`;
}

function generateLogging() {
  return `
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('temperature_client.log')
    ]
)
logger = logging.getLogger(__name__)
`
};

function generateClientClass(asyncapi, params) {
  try {
     try {
    const { hostname, port } = getServerConfig(asyncapi, params);
    const { topic, message } = getChannelConfig(asyncapi);
    const { tempIdPattern, requiredFields } = getMessageSchema(message);
} catch (error) {
    throw new Error(`Processing failed: ${error.message || error}`);
}

    return `
class TemperatureClient:
    def __init__(self, host: str = "${hostname}", port: int = ${port}):
        try:
            self.client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
            self.host = host
            self.port = port
            self.topic = "${topic}"
            self.temp_id_pattern = re.compile(r"${tempIdPattern}")
            self.required_fields = ${JSON.stringify(requiredFields)} 
            
            # State flags
            self.connected = False
            self.published = False
            
            # Configure callbacks
            self.client.on_connect = self._on_connect
            self.client.on_publish = self._on_publish
            self.client.on_disconnect = self._on_disconnect
            self.client.on_log = self._on_log
            
        except Exception as e:
            logger.error(f"Client initialization failed: {str(e)}")
            raise

    def _on_connect(self, client: mqtt.Client, userdata, flags, reason_code, properties):
        """Handle connection event (Callback API V2)"""
        if reason_code.is_failure:
            logger.error(f"Connection failed: {reason_code}")
            client.disconnect()
        else:
            self.connected = True
            logger.info(f"Connected to {self.host}:{self.port}")

    def _on_publish(self, client: mqtt.Client, userdata, mid, reason_code, properties):
        """Handle publish confirmation"""
        if reason_code.is_failure:
            logger.error(f"Publish failed for message {mid}: {reason_code}")
        else:
            self.published = True
            logger.info(f"Message {mid} acknowledged by broker")
        client.disconnect()

    def _on_disconnect(self, client: mqtt.Client, userdata, disconnect_flags, reason_code, properties):
        """Handle disconnection"""
        self.connected = False
        logger.info(f"Disconnected (Reason: {reason_code})")
        client.loop_stop()

    def _on_log(self, client: mqtt.Client, userdata, level, buf, properties=None):
        """Handle MQTT logs"""
        if level == mqtt.MQTT_LOG_ERR:
            logger.error(f"MQTT Error: {buf}")
        elif level == mqtt.MQTT_LOG_WARNING:
            logger.warning(f"MQTT Warning: {buf}")

    def _validate_temperature_id(self, temp_id: str):
        """Validate ID matches AsyncAPI schema pattern"""
        if not self.temp_id_pattern.match(temp_id):
            raise ValueError(f"Invalid temperature ID format. Must match: {self.temp_id_pattern.pattern}")

    def _validate_payload(self, payload: dict):
        """Validate payload against AsyncAPI schema"""
        # Validate required fields
        missing = [f for f in self.required_fields if f not in payload]
        if missing:
            raise ValueError(f"Missing required fields: {missing}")

        # Validate temperatureId format
        if 'temperatureId' in payload:
            if not self.temp_id_pattern.match(payload['temperatureId']):
                raise ValueError(
                    f"temperatureId must match pattern: {self.temp_id_pattern.pattern}"
                )

        # Validate value type
        if 'value' in payload and not isinstance(payload['value'], (int, float)):
            raise TypeError("Temperature value must be numeric")

    def _create_payload(self, temp_id: str, value: Union[int, float]) -> dict:
        """
        Create payload according to AsyncAPI spec
        
        Args:
            temp_id: Temperature event ID (format: {self.temp_id_pattern.pattern})
            value: Temperature reading
            
        Returns:
            Dictionary with validated payload
        """
        self._validate_temperature_id(temp_id)
        
        if not isinstance(value, (int, float)):
            raise TypeError("Temperature value must be numeric")
            
        payload = {
            "temperatureId": temp_id,
            "value": round(float(value), 1)  # Round to 1 decimal place
        }
        self._validate_payload(payload)
        return payload

    def publish_temperature(self, value: Union[int, float], retries: int = 3):
        """
        Publish temperature reading to MQTT broker
        
        Args:
            value: Temperature value to publish
            retries: Number of connection attempts
        """
        for attempt in range(1, retries + 1):
            try:
                temp_id = self.generate_temperature_id()
                payload = self._create_payload(temp_id, value)
                
                logger.info(f"Attempt {attempt}/{retries}: Publishing {value}°C (ID: {temp_id})")
                
                self.client.connect(self.host, self.port, 60)
                self.client.loop_start()
                
                # Wait for connection
                while not self.connected and attempt < retries:
                    sleep(0.5)
                
                if not self.connected:
                    continue
                
                result = self.client.publish(
                    self.topic,
                    json.dumps(payload),
                    qos=1
                )
                
                # Wait for publish confirmation
                while not self.published and attempt < retries:
                    sleep(0.5)
                
                if self.published:
                    return True
                    
            except Exception as e:
                logger.error(f"Attempt {attempt} failed: {str(e)}")
                self._cleanup()
            finally:
                self._cleanup()
        
        return False

    def _cleanup(self):
        """Ensure clean disconnection"""
        if self.connected:
            self.client.disconnect()
        self.client.loop_stop()
        self.connected = False
        self.published = False

    @staticmethod
    def generate_temperature_id() -> str:
        """Generate valid temperature ID per AsyncAPI schema"""
        return f"temp-{uuid.uuid4().hex[:5]}"  `;
  } catch (e) {
    throw new Error(`Error generating ClientClass [message : ${e.message}]`);
  }
}
  
function generateSimulateTemperature() {
  return `
def simulate_temperature(client: TemperatureClient, interval: int = 5):
    """Continuously generate and publish temperature readings"""
    logger.info("Starting temperature simulation...")
    try:
        while True:
            temp = round(random.uniform(18.0, 28.0), 1)  # Realistic range
            client.publish_temperature(temp)
            sleep(interval)
    except KeyboardInterrupt:
        logger.info("Simulation stopped by user")
`
}

function generateMain(asyncapi, params) {  
  try {
      const { hostname, port } = getServerConfig(asyncapi, params);
      return `
def main():
    parser = argparse.ArgumentParser(
        description="AsyncAPI Temperature Client",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument(
        "--host",
        default="${hostname}",
        help="MQTT broker host"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=${port},
        help="MQTT broker port"
    )
    parser.add_argument(
        "--temperature",
        type=float,
        help="Specific temperature value to send"
    )
    parser.add_argument(
        "--simulate",
        action="store_true",
        help="Generate random temperature values"
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=5,
        help="Interval between simulated readings (seconds)"
    )
    
    args = parser.parse_args()
    
    try:
        client = TemperatureClient(host=args.host, port=args.port)
        
        if args.simulate:
            simulate_temperature(client, args.interval)
        elif args.temperature is not None:
            success = client.publish_temperature(args.temperature)
            if not success:
                logger.error("Failed to publish temperature")
        else:
            logger.info("No temperature specified. Using sample value 22.5°C")
            client.publish_temperature(22.5)
            
    except Exception as e:
        logger.error(f"Application error: {str(e)}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
`;
    } catch (e){
      throw new Error(`Error generating Main [message : ${e.message}]`);
    }
  }
function getServerConfig(asyncapi, params = {}) {
  const serverName = params?.server || 'dev';
  
  if (!asyncapi.servers()) {
    throw new Error(`No servers defined in AsyncAPI document. Please define at least one server.`);
  }

  const server = asyncapi.servers().get(serverName);
  if (!server) {
    throw new Error(`Server '${serverName}' not found in AsyncAPI document. Available servers: ${Array.from(asyncapi.servers().all()).map(s => s.id())}`);
  }

  try {
    const host = server.host();
    const url = new URL(host.includes('://') ? host : `mqtt://${host}`);
    return {
      hostname: url.hostname,
      port: url.port || (server.protocol() === 'mqtt' ? 1883 : 8883),
      protocol: server.protocol()
    };
  } catch (e) {
    throw new Error(`Invalid server URL configuration for server '${serverName}': ${e.message}`);
  }
}

function getChannelConfig(asyncapi) {
  if (!asyncapi.channels()) {
    throw new Error('No channels defined in AsyncAPI document');
  }

  const channel = asyncapi.channels().get('temperature/changed');
  if (!channel) {
    throw new Error(`Channel 'temperature/changed' not found in AsyncAPI document. Available channels: ${Array.from(asyncapi.channels().all()).map(c => c.id())}`);
  }

  const messages = channel.messages();
  if (!messages || messages.all().length === 0) {
    throw new Error(`No messages defined for channel 'temperature/changed'`);
  }

  const message = messages.all()[0];
  if (!message) {
    throw new Error(`Failed to retrieve message from channel 'temperature/changed'`);
  }

  return {
    topic: 'temperature/changed',
    message
  };
}

function getMessageSchema(message) {
  if (!message) {
    throw new Error('Message is undefined');
  }

  const payloadSchema = message.payload();
  if (!payloadSchema) {
    throw new Error('No payload schema found for message');
  }

  // Get properties and required fields
  const properties = payloadSchema.properties();
  const requiredFields = payloadSchema.required() || ['temperatureId', 'value'];

  // Handle temperatureId pattern - check both direct pattern and $ref
  let tempIdPattern = '^temp-[a-zA-Z0-9]{5}$';
  
  if (properties?.temperatureId) {
    const tempIdProp = properties.temperatureId;
    
    if (tempIdProp.pattern) {
      // Direct pattern definition
      tempIdPattern = tempIdProp.pattern();
    } else if (tempIdProp.$ref) {
      // Reference to components/schemas/temperatureId
      // Since we know the pattern from the schema, we use it directly
      tempIdPattern = '^temp-[a-zA-Z0-9]{5}$';
    }
  }
  throw new Error(tempIdPattern)
  return {
    tempIdPattern,
    requiredFields,
    payloadSchema
  };
}

export default function({ asyncapi, params = {} }) {
  return (
    <File name="client.py">
      {generateHeader(asyncapi, params)}
      {generateImports()}
      {generateLogging()}
      {generateClientClass(asyncapi, params)}
      {generateSimulateTemperature()}
      {generateMain(asyncapi, params)}
    </File>
  );
}

