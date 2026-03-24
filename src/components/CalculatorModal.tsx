import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, 
  Dimensions, Platform 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Typography } from '../theme/typography';
import { useTranslation } from 'react-i18next';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CalculatorModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (result: number) => void;
  initialValue?: string | number;
}

export default function CalculatorModal({ 
  visible, 
  onClose, 
  onSubmit, 
  initialValue = '' 
}: CalculatorModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('');

  // Reset or set initial value when modal opens
  useEffect(() => {
    if (visible) {
      if (initialValue && Number(initialValue) > 0) {
        setExpression(initialValue.toString());
        setResult(initialValue.toString());
      } else {
        setExpression('');
        setResult('');
      }
    }
  }, [visible, initialValue]);

  // Safe Math Evaluator
  const evaluateExpression = (expr: string): string => {
    if (!expr) return '';
    try {
      // Replace safe display operators with actual JS operators
      let safeExpr = expr.replace(/×/g, '*').replace(/÷/g, '/');
      // Only keep digits, generic operators, minus, dot
      safeExpr = safeExpr.replace(/[^0-9+\-*/.]/g, '');
      
      // If ends with an operator, wait before evaluating
      if (/[+\-*/.]$/.test(safeExpr)) {
        return ''; 
      }
      
      // eslint-disable-next-line no-new-func
      const evalResult = new Function('return ' + safeExpr)();
      
      if (evalResult === Infinity || isNaN(evalResult)) {
        return 'Error';
      }
      
      return evalResult.toString();
    } catch (e) {
      return '';
    }
  };

  const calculateOnFly = (newExpr: string) => {
    const res = evaluateExpression(newExpr);
    if (res && res !== 'Error') {
      setResult(res);
    } else if (newExpr === '') {
      setResult('');
    }
  };

  const handlePress = (value: string) => {
    if (expression === 'Error') {
      setExpression(value);
      calculateOnFly(value);
      return;
    }

    // Handle percentage
    if (value === '%') {
      if (result && result !== 'Error') {
        const val = parseFloat(result) / 100;
        setExpression(val.toString());
        setResult(val.toString());
      }
      return;
    }

    const lastChar = expression.slice(-1);
    const operators = ['+', '-', '×', '÷'];
    
    // Prevent multiple consecutive operators
    if (operators.includes(value) && operators.includes(lastChar)) {
      const newExpr = expression.slice(0, -1) + value;
      setExpression(newExpr);
      return;
    }
    
    // Prevent operator at start (except minus)
    if (expression.length === 0 && operators.includes(value) && value !== '-') {
      return;
    }

    const newExpr = expression + value;
    setExpression(newExpr);
    calculateOnFly(newExpr);
  };

  const handleDelete = () => {
    if (expression === 'Error') {
      setExpression('');
      setResult('');
      return;
    }
    const newExpr = expression.slice(0, -1);
    setExpression(newExpr);
    calculateOnFly(newExpr);
  };

  const handleClear = () => {
    setExpression('');
    setResult('');
  };

  const handleSubmit = () => {
    let finalValue = result || expression;
    finalValue = evaluateExpression(finalValue) || finalValue;
    
    if (finalValue === 'Error' || isNaN(Number(finalValue))) {
       finalValue = '0';
    }
    
    // Check if empty
    if (!finalValue) {
       finalValue = '0';
    }

    onSubmit(Number(finalValue));
    onClose();
  };

  const handleEqual = () => {
    const res = evaluateExpression(expression);
    if (res && res !== 'Error') {
      setExpression(res);
      setResult(res);
    }
  };

  const formatDisplay = (val: string) => {
    if (!val || val === 'Error') return val;
    // Format only the last number in the expression with standard Intl logic or we leave expression raw
    // For simplicity, we keep expression raw and only format the result.
    return val;
  };

  const formatResultDisplay = (val: string) => {
    if (!val || val === 'Error') return val;
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const renderButton = (label: string, type: 'number' | 'operator' | 'action' = 'number') => {
    const isNumber = type === 'number';
    const isOperator = type === 'operator';
    
    let bgColor = colors.inputBackground;
    let textColor = colors.text;

    if (isOperator) {
      bgColor = colors.primary + '15';
      textColor = colors.primary;
    } else if (label === 'C' || label === '⌫') {
      bgColor = colors.danger + '15';
      textColor = colors.danger;
    } else if (label === '=') {
      bgColor = colors.primary;
      textColor = '#fff';
    }

    return (
      <TouchableOpacity
        key={label}
        style={[styles.btn, { backgroundColor: bgColor }]}
        onPress={() => {
          if (label === 'C') handleClear();
          else if (label === '⌫') handleDelete();
          else if (label === '=') handleEqual();
          else handlePress(label);
        }}
        activeOpacity={0.7}
      >
        {label === '⌫' ? (
          <MaterialCommunityIcons name="backspace-outline" size={24} color={textColor} />
        ) : (
          <Text style={[styles.btnText, { color: textColor, fontWeight: isOperator || label === '=' ? 'bold' : 'normal' }]}>
            {label}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        
        <View style={[styles.container, { backgroundColor: colors.surface, paddingBottom: Platform.OS === 'ios' ? 40 : 20 }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
            <Text style={[Typography.h4, { color: colors.text }]}>{t('common.calculator') || 'Kalkulator'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Display Base */}
          <View style={[styles.display, { backgroundColor: colors.background }]}>
            <Text 
              style={[styles.expressionText, { color: colors.textSecondary }]} 
              numberOfLines={2} 
              adjustsFontSizeToFit
            >
              {formatDisplay(expression) || '0'}
            </Text>
            <Text 
              style={[styles.resultText, { color: colors.text }]} 
              numberOfLines={1} 
              adjustsFontSizeToFit
            >
              = {formatResultDisplay(result) || '0'}
            </Text>
          </View>

          {/* Keypad Base */}
          <View style={styles.keypad}>
            <View style={styles.row}>
              {renderButton('C', 'action')}
              {renderButton('⌫', 'action')}
              {renderButton('%', 'operator')}
              {renderButton('÷', 'operator')}
            </View>
            <View style={styles.row}>
              {renderButton('7')}
              {renderButton('8')}
              {renderButton('9')}
              {renderButton('×', 'operator')}
            </View>
            <View style={styles.row}>
              {renderButton('4')}
              {renderButton('5')}
              {renderButton('6')}
              {renderButton('-', 'operator')}
            </View>
            <View style={styles.row}>
              {renderButton('1')}
              {renderButton('2')}
              {renderButton('3')}
              {renderButton('+', 'operator')}
            </View>
            <View style={styles.row}>
              {renderButton('000')}
              {renderButton('0')}
              {renderButton('.')}
              {renderButton('=', 'action')}
            </View>
          </View>
          
          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            <Text style={[Typography.button, { color: '#fff' }]}>
              {t('common.save') || 'Simpan'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: {
    flex: 1,
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  closeBtn: {
    padding: 4,
  },
  display: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  expressionText: {
    fontSize: 24,
    marginBottom: 8,
    minHeight: 32,
  },
  resultText: {
    fontSize: 36,
    fontWeight: '700',
  },
  keypad: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  btn: {
    flex: 1,
    aspectRatio: 1.25,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 24,
  },
  submitBtn: {
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
