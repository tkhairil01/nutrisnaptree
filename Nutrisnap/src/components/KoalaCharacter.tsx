import React from 'react';
import { View, Image, StyleSheet, Animated, Easing, Text } from 'react-native';
import { SvgXml } from 'react-native-svg';

// Define the expression types
export type KoalaExpression = 
  | 'happy' 
  | 'sad' 
  | 'excited' 
  | 'sleepy' 
  | 'motivated' 
  | 'thinking' 
  | 'neutral';

interface KoalaCharacterProps {
  expression?: KoalaExpression;
  size?: number;
  message?: string;
  animate?: boolean;
}

// SVG for Koala character
const koalaSvgs: Record<KoalaExpression, string> = {
  // Happy Koala
  happy: `
  <svg width="100%" height="100%" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <!-- Body -->
    <circle cx="100" cy="100" r="70" fill="#A9A9A9" />
    
    <!-- Ears -->
    <circle cx="40" cy="50" r="25" fill="#808080" />
    <circle cx="160" cy="50" r="25" fill="#808080" />
    <circle cx="40" cy="50" r="15" fill="#FFCBC4" />
    <circle cx="160" cy="50" r="15" fill="#FFCBC4" />
    
    <!-- Face -->
    <circle cx="100" cy="100" r="60" fill="#C0C0C0" />
    
    <!-- Eyes -->
    <circle cx="75" cy="85" r="10" fill="white" />
    <circle cx="125" cy="85" r="10" fill="white" />
    <circle cx="75" cy="85" r="5" fill="black" />
    <circle cx="125" cy="85" r="5" fill="black" />
    
    <!-- Nose -->
    <circle cx="100" cy="105" r="10" fill="#333" />
    
    <!-- Mouth - Happy -->
    <path d="M70 115 Q100 140 130 115" stroke="black" stroke-width="3" fill="none" />
  </svg>
  `,
  
  // Sad Koala
  sad: `
  <svg width="100%" height="100%" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <!-- Body -->
    <circle cx="100" cy="100" r="70" fill="#A9A9A9" />
    
    <!-- Ears -->
    <circle cx="40" cy="50" r="25" fill="#808080" />
    <circle cx="160" cy="50" r="25" fill="#808080" />
    <circle cx="40" cy="50" r="15" fill="#FFCBC4" />
    <circle cx="160" cy="50" r="15" fill="#FFCBC4" />
    
    <!-- Face -->
    <circle cx="100" cy="100" r="60" fill="#C0C0C0" />
    
    <!-- Eyes -->
    <circle cx="75" cy="85" r="10" fill="white" />
    <circle cx="125" cy="85" r="10" fill="white" />
    <circle cx="75" cy="85" r="5" fill="black" />
    <circle cx="125" cy="85" r="5" fill="black" />
    
    <!-- Eyebrows - Sad -->
    <path d="M65 75 Q75 70 85 75" stroke="black" stroke-width="2" fill="none" />
    <path d="M115 75 Q125 70 135 75" stroke="black" stroke-width="2" fill="none" />
    
    <!-- Nose -->
    <circle cx="100" cy="105" r="10" fill="#333" />
    
    <!-- Mouth - Sad -->
    <path d="M70 125 Q100 110 130 125" stroke="black" stroke-width="3" fill="none" />
    
    <!-- Tears -->
    <path d="M70 95 L65 110" stroke="#6EB5FF" stroke-width="2" />
    <circle cx="65" cy="110" r="3" fill="#6EB5FF" />
    <path d="M130 95 L135 110" stroke="#6EB5FF" stroke-width="2" />
    <circle cx="135" cy="110" r="3" fill="#6EB5FF" />
  </svg>
  `,
  
  // Excited Koala
  excited: `
  <svg width="100%" height="100%" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <!-- Body -->
    <circle cx="100" cy="100" r="70" fill="#A9A9A9" />
    
    <!-- Ears -->
    <circle cx="40" cy="50" r="25" fill="#808080" />
    <circle cx="160" cy="50" r="25" fill="#808080" />
    <circle cx="40" cy="50" r="15" fill="#FFCBC4" />
    <circle cx="160" cy="50" r="15" fill="#FFCBC4" />
    
    <!-- Face -->
    <circle cx="100" cy="100" r="60" fill="#C0C0C0" />
    
    <!-- Eyes - Wide open -->
    <circle cx="75" cy="85" r="12" fill="white" />
    <circle cx="125" cy="85" r="12" fill="white" />
    <circle cx="75" cy="85" r="6" fill="black" />
    <circle cx="125" cy="85" r="6" fill="black" />
    
    <!-- Nose -->
    <circle cx="100" cy="105" r="10" fill="#333" />
    
    <!-- Mouth - Big smile -->
    <path d="M65 115 Q100 150 135 115" stroke="black" stroke-width="3" fill="none" />
    
    <!-- Sparkles -->
    <path d="M40 30 L45 35 L40 40 L35 35 Z" fill="yellow" />
    <path d="M160 30 L165 35 L160 40 L155 35 Z" fill="yellow" />
    <path d="M100 20 L105 25 L100 30 L95 25 Z" fill="yellow" />
  </svg>
  `,
  
  // Sleepy Koala
  sleepy: `
  <svg width="100%" height="100%" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <!-- Body -->
    <circle cx="100" cy="100" r="70" fill="#A9A9A9" />
    
    <!-- Ears -->
    <circle cx="40" cy="50" r="25" fill="#808080" />
    <circle cx="160" cy="50" r="25" fill="#808080" />
    <circle cx="40" cy="50" r="15" fill="#FFCBC4" />
    <circle cx="160" cy="50" r="15" fill="#FFCBC4" />
    
    <!-- Face -->
    <circle cx="100" cy="100" r="60" fill="#C0C0C0" />
    
    <!-- Eyes - Half closed -->
    <ellipse cx="75" cy="85" rx="10" ry="5" fill="white" />
    <ellipse cx="125" cy="85" rx="10" ry="5" fill="white" />
    <ellipse cx="75" cy="85" rx="5" ry="2" fill="black" />
    <ellipse cx="125" cy="85" rx="5" ry="2" fill="black" />
    
    <!-- Nose -->
    <circle cx="100" cy="105" r="10" fill="#333" />
    
    <!-- Mouth - Yawning -->
    <ellipse cx="100" cy="125" rx="15" ry="10" fill="#FF9999" />
    
    <!-- Zzz -->
    <text x="140" y="60" font-family="Arial" font-size="20" fill="#6EB5FF">z</text>
    <text x="150" y="45" font-family="Arial" font-size="25" fill="#6EB5FF">z</text>
    <text x="165" y="30" font-family="Arial" font-size="30" fill="#6EB5FF">Z</text>
  </svg>
  `,
  
  // Motivated Koala
  motivated: `
  <svg width="100%" height="100%" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <!-- Body -->
    <circle cx="100" cy="100" r="70" fill="#A9A9A9" />
    
    <!-- Ears -->
    <circle cx="40" cy="50" r="25" fill="#808080" />
    <circle cx="160" cy="50" r="25" fill="#808080" />
    <circle cx="40" cy="50" r="15" fill="#FFCBC4" />
    <circle cx="160" cy="50" r="15" fill="#FFCBC4" />
    
    <!-- Face -->
    <circle cx="100" cy="100" r="60" fill="#C0C0C0" />
    
    <!-- Eyes - Determined -->
    <circle cx="75" cy="85" r="10" fill="white" />
    <circle cx="125" cy="85" r="10" fill="white" />
    <circle cx="75" cy="85" r="5" fill="black" />
    <circle cx="125" cy="85" r="5" fill="black" />
    
    <!-- Eyebrows - Determined -->
    <path d="M65 75 L85 70" stroke="black" stroke-width="2" />
    <path d="M115 70 L135 75" stroke="black" stroke-width="2" />
    
    <!-- Nose -->
    <circle cx="100" cy="105" r="10" fill="#333" />
    
    <!-- Mouth - Determined smile -->
    <path d="M75 120 Q100 130 125 120" stroke="black" stroke-width="3" fill="none" />
    
    <!-- Muscle arm -->
    <path d="M30 100 C20 90 20 110 30 120 L40 110 Z" fill="#A9A9A9" />
    <path d="M170 100 C180 90 180 110 170 120 L160 110 Z" fill="#A9A9A9" />
  </svg>
  `,
  
  // Thinking Koala
  thinking: `
  <svg width="100%" height="100%" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <!-- Body -->
    <circle cx="100" cy="100" r="70" fill="#A9A9A9" />
    
    <!-- Ears -->
    <circle cx="40" cy="50" r="25" fill="#808080" />
    <circle cx="160" cy="50" r="25" fill="#808080" />
    <circle cx="40" cy="50" r="15" fill="#FFCBC4" />
    <circle cx="160" cy="50" r="15" fill="#FFCBC4" />
    
    <!-- Face -->
    <circle cx="100" cy="100" r="60" fill="#C0C0C0" />
    
    <!-- Eyes - Looking up -->
    <circle cx="75" cy="85" r="10" fill="white" />
    <circle cx="125" cy="85" r="10" fill="white" />
    <circle cx="75" cy="80" r="5" fill="black" />
    <circle cx="125" cy="80" r="5" fill="black" />
    
    <!-- Nose -->
    <circle cx="100" cy="105" r="10" fill="#333" />
    
    <!-- Mouth - Thinking -->
    <path d="M85 125 Q100 120 115 125" stroke="black" stroke-width="2" fill="none" />
    
    <!-- Thinking bubble -->
    <circle cx="150" cy="50" r="5" fill="white" />
    <circle cx="160" cy="40" r="8" fill="white" />
    <circle cx="175" cy="25" r="15" fill="white" />
  </svg>
  `,
  
  // Neutral Koala
  neutral: `
  <svg width="100%" height="100%" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <!-- Body -->
    <circle cx="100" cy="100" r="70" fill="#A9A9A9" />
    
    <!-- Ears -->
    <circle cx="40" cy="50" r="25" fill="#808080" />
    <circle cx="160" cy="50" r="25" fill="#808080" />
    <circle cx="40" cy="50" r="15" fill="#FFCBC4" />
    <circle cx="160" cy="50" r="15" fill="#FFCBC4" />
    
    <!-- Face -->
    <circle cx="100" cy="100" r="60" fill="#C0C0C0" />
    
    <!-- Eyes -->
    <circle cx="75" cy="85" r="10" fill="white" />
    <circle cx="125" cy="85" r="10" fill="white" />
    <circle cx="75" cy="85" r="5" fill="black" />
    <circle cx="125" cy="85" r="5" fill="black" />
    
    <!-- Nose -->
    <circle cx="100" cy="105" r="10" fill="#333" />
    
    <!-- Mouth - Neutral -->
    <line x1="80" y1="125" x2="120" y2="125" stroke="black" stroke-width="3" />
  </svg>
  `,
};

const KoalaCharacter: React.FC<KoalaCharacterProps> = ({
  expression = 'neutral',
  size = 150,
  message,
  animate = true,
}) => {
  // Animation for bouncing effect
  const bounceAnim = React.useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    if (animate) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [animate, bounceAnim]);
  
  const translateY = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });
  
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.koalaContainer,
          { transform: [{ translateY }] },
          { width: size, height: size },
        ]}
      >
        <SvgXml xml={koalaSvgs[expression]} width="100%" height="100%" />
      </Animated.View>
      
      {message && (
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  koalaContainer: {
    // Shadow for the koala
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  messageContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 10,
    marginTop: 10,
    maxWidth: 200,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  messageText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default KoalaCharacter;