/**
 * History Screen
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import {
  Text,
  Surface,
  Searchbar,
  IconButton,
  FAB,
  Card,
  Chip,
} from 'react-native-paper';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import StorageService from '../services/storage';
import { colors, spacing, typography } from '../theme';

export default function HistoryScreen() {
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    filterMessages();
  }, [searchQuery, messages]);

  const loadHistory = async () => {
    const history = await StorageService.getConversationHistory();
    setMessages(history);
  };

  const filterMessages = () => {
    if (!searchQuery.trim()) {
      setFilteredMessages(messages);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = messages.filter((msg) =>
      msg.text.toLowerCase().includes(query)
    );
    setFilteredMessages(filtered);
  };

  const groupMessagesByDate = () => {
    const grouped = {};
    
    filteredMessages.forEach((msg) => {
      const date = new Date(msg.timestamp).toLocaleDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(msg);
    });

    return Object.entries(grouped).map(([date, msgs]) => ({
      date,
      messages: msgs,
    }));
  };

  const exportHistory = async () => {
    if (messages.length === 0) {
      Alert.alert('No History', 'There are no conversations to export');
      return;
    }

    try {
      const content = messages
        .map((msg) => {
          const role = msg.isUser ? 'User' : 'JARVIS';
          const time = new Date(msg.timestamp).toLocaleString();
          return `[${time}] ${role}:\n${msg.text}\n`;
        })
        .join('\n---\n\n');

      const filename = `jarvis-history-${Date.now()}.txt`;
      const fileUri = FileSystem.documentDirectory + filename;

      await FileSystem.writeAsStringAsync(fileUri, content);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Success', `History saved to ${fileUri}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export history');
    }
  };

  const clearHistory = async () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all conversation history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await StorageService.clearConversationHistory();
            setMessages([]);
            setFilteredMessages([]);
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }) => (
    <Card style={styles.messageCard}>
      <Card.Content>
        <View style={styles.messageHeader}>
          <Chip
            icon={item.isUser ? 'account' : 'robot'}
            style={[
              styles.roleChip,
              item.isUser ? styles.userChip : styles.assistantChip,
            ]}
            textStyle={styles.chipText}
          >
            {item.isUser ? 'You' : 'JARVIS'}
          </Chip>
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        </View>
        
        <Text style={styles.messageText} numberOfLines={5}>
          {item.text}
        </Text>

        {item.tokensUsed && (
          <Text style={styles.tokens}>
            {item.tokensUsed} tokens
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  const renderDateGroup = ({ item }) => (
    <View style={styles.dateGroup}>
      <Text style={styles.dateHeader}>{item.date}</Text>
      {item.messages.map((msg) => (
        <View key={msg.id}>{renderMessage({ item: msg })}</View>
      ))}
    </View>
  );

  const groupedData = groupMessagesByDate();

  return (
    <View style={styles.container}>
      {/* Header */}
      <Surface style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>History</Text>
          <View style={styles.headerActions}>
            <IconButton
              icon="export"
              size={24}
              iconColor={colors.onSurfaceVariant}
              onPress={exportHistory}
            />
            <IconButton
              icon="delete-outline"
              size={24}
              iconColor={colors.error}
              onPress={clearHistory}
            />
          </View>
        </View>
        
        <Searchbar
          placeholder="Search conversations..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          iconColor={colors.primary}
        />
      </Surface>

      {/* Messages List */}
      {groupedData.length > 0 ? (
        <FlatList
          data={groupedData}
          renderItem={renderDateGroup}
          keyExtractor={(item) => item.date}
          contentContainerStyle={styles.list}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? 'No matching conversations' : 'No conversation history'}
          </Text>
        </View>
      )}

      {/* Floating Export Button */}
      {messages.length > 0 && (
        <FAB
          icon="download"
          style={styles.fab}
          onPress={exportHistory}
          color={colors.onPrimary}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.title,
    color: colors.primary,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
  },
  searchBar: {
    backgroundColor: colors.surfaceVariant,
    elevation: 0,
  },
  searchInput: {
    color: colors.onSurface,
  },
  list: {
    padding: spacing.md,
  },
  dateGroup: {
    marginBottom: spacing.lg,
  },
  dateHeader: {
    ...typography.subtitle,
    color: colors.primary,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  messageCard: {
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceVariant,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  roleChip: {
    height: 28,
  },
  userChip: {
    backgroundColor: colors.primary + '20',
  },
  assistantChip: {
    backgroundColor: colors.secondary + '20',
  },
  chipText: {
    fontSize: 12,
    color: colors.onSurface,
  },
  timestamp: {
    ...typography.small,
    color: colors.onSurfaceVariant,
  },
  messageText: {
    ...typography.body,
    color: colors.onSurface,
    lineHeight: 22,
  },
  tokens: {
    ...typography.small,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.onSurfaceVariant,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.primary,
  },
});
