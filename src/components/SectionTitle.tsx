import { Text, View } from 'react-native';
import { styles } from '../theme/appStyles';

export default function SectionTitle({ children, detail }: { children: string; detail?: string; }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {detail ? <Text style={styles.sectionDetail}>{detail}</Text> : null}
    </View>
  );
}
