import React, { useEffect } from "react";
import { Image, Text, View } from "react-native";
import styles from '../styles/HomeScreen.styles';
import { LinearGradient } from "expo-linear-gradient";

export default function HomeScreen({ navigation }) {

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace("PlayerScreen");
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return ( 
    <LinearGradient
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 0 }} 
  colors={['purple', 'rgb(174,45,174)', 'rgb(19,19,155)']}
  style={styles.linearGradient}
>
    
    <View style={styles.homeScreenBody}>

        <View style={styles.homeLogo}>    
      <Image
        source={require('../assets/images/KingzPlayerLogo.png')}
        style={{ width: 300, height: 300, resizeMode: 'cover' }}
      />
      </View>

      <View style={styles.homeLogoText}>
      <Text style={{color: 'white', fontSize: 30,   fontFamily: 'sans-serif'}}>
        KingzPlay
      </Text>
      
      <Text style={{ color: "white", marginTop: 10 }}>
        Welcome to music world...
      </Text>
      </View>

    </View>
    
    </LinearGradient>
  );
}
