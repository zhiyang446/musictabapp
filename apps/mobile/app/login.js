import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { supabase } from '../supabase/client';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  
  // 验证状态
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [resetEmailError, setResetEmailError] = useState('');

  // 验证函数
  const validateEmail = (email) => {
    if (!email) {
      return '邮箱地址不能为空';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return '请输入有效的邮箱地址';
    }
    return '';
  };

  const validatePassword = (password, isSignUp = false) => {
    if (!password) {
      return '密码不能为空';
    }
    
    if (isSignUp) {
      if (password.length < 8) {
        return '密码至少需要8个字符';
      }
      if (!/(?=.*[a-z])/.test(password)) {
        return '密码需要包含至少一个小写字母';
      }
      if (!/(?=.*[A-Z])/.test(password)) {
        return '密码需要包含至少一个大写字母';
      }
      if (!/(?=.*\d)/.test(password)) {
        return '密码需要包含至少一个数字';
      }
      if (!/(?=.*[!@#$%^&*])/.test(password)) {
        return '密码需要包含至少一个特殊字符 (!@#$%^&*)';
      }
    } else {
      if (password.length < 6) {
        return '密码至少需要6个字符';
      }
    }
    
    return '';
  };

  // 实时验证
  const handleEmailChange = (text) => {
    setEmail(text);
    setEmailError(validateEmail(text));
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    setPasswordError(validatePassword(text, isSignUp));
  };

  const handleResetEmailChange = (text) => {
    setResetEmail(text);
    setResetEmailError(validateEmail(text));
  };

  // 获取用户友好的错误消息
  const getFriendlyErrorMessage = (error) => {
    if (!error) return '';
    
    const errorMessage = error.message || error;
    
    console.log('🔍 Raw error message:', errorMessage);
    
    // Supabase 常见错误消息的友好翻译
    const errorMap = {
      'Invalid login credentials': '邮箱或密码错误，请检查后重试',
      'Email not confirmed': '请先验证您的邮箱地址',
      'User already registered': '该邮箱已被注册，请直接登录',
      'Password should be at least 6 characters': '密码至少需要6个字符',
      'Unable to validate email address: invalid format': '邮箱格式无效',
      'User not found': '用户不存在，请先注册',
      'Too many requests': '请求过于频繁，请稍后再试',
      'Email rate limit exceeded': '邮件发送过于频繁，请稍后再试',
      'Signup disabled': '注册功能暂时不可用',
      'Signup is disabled': '注册功能暂时不可用',
      'Signups not allowed for this instance': '当前不允许注册',
      'Signup is disabled for this instance': '当前不允许注册',
      'Invalid email or password': '邮箱或密码错误',
      'Invalid email': '邮箱格式无效',
      'Invalid password': '密码格式无效',
      'Password should be at least 6 characters': '密码至少需要6个字符',
      'Password should be at least 8 characters': '密码至少需要8个字符',
      'Password should contain at least one letter': '密码需要包含至少一个字母',
      'Password should contain at least one number': '密码需要包含至少一个数字',
      'Password should contain at least one special character': '密码需要包含至少一个特殊字符',
      // 添加更多可能的错误消息
      'Invalid login credentials.': '邮箱或密码错误，请检查后重试',
      'Invalid login credentials!': '邮箱或密码错误，请检查后重试',
      'Invalid login credentials, please try again': '邮箱或密码错误，请检查后重试',
      'Invalid email or password.': '邮箱或密码错误',
      'Invalid email or password!': '邮箱或密码错误',
      'Invalid email or password, please try again': '邮箱或密码错误，请重试',
      'User not found.': '用户不存在，请先注册',
      'User not found!': '用户不存在，请先注册',
      'User not found, please sign up first': '用户不存在，请先注册',
      'Email not confirmed.': '请先验证您的邮箱地址',
      'Email not confirmed!': '请先验证您的邮箱地址',
      'Please confirm your email address': '请先验证您的邮箱地址',
      'Account not found': '账户不存在',
      'Account not found.': '账户不存在',
      'Account not found!': '账户不存在',
      'No user found with this email': '未找到使用此邮箱的用户',
      'No user found with this email.': '未找到使用此邮箱的用户',
      'No user found with this email!': '未找到使用此邮箱的用户',
      'Incorrect password': '密码错误',
      'Incorrect password.': '密码错误',
      'Incorrect password!': '密码错误',
      'Wrong password': '密码错误',
      'Wrong password.': '密码错误',
      'Wrong password!': '密码错误',
      'Password is incorrect': '密码错误',
      'Password is incorrect.': '密码错误',
      'Password is incorrect!': '密码错误',
      'Email does not exist': '邮箱不存在',
      'Email does not exist.': '邮箱不存在',
      'Email does not exist!': '邮箱不存在',
      'Email not found': '邮箱不存在',
      'Email not found.': '邮箱不存在',
      'Email not found!': '邮箱不存在',
    };

    const friendlyMessage = errorMap[errorMessage] || errorMessage;
    console.log('🔍 Friendly error message:', friendlyMessage);
    
    return friendlyMessage;
  };

  const handleEmailAuth = async () => {
    console.log('🔧 handleEmailAuth called');
    console.log('📝 Email:', email);
    console.log('📝 Password length:', password.length);
    console.log('📝 Is SignUp:', isSignUp);
    
    // 清除之前的错误
    setEmailError('');
    setPasswordError('');
    
    // 验证表单
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password, isSignUp);
    
    if (emailValidation) {
      console.log('❌ Email validation failed:', emailValidation);
      setEmailError(emailValidation);
      return;
    }
    
    if (passwordValidation) {
      console.log('❌ Password validation failed:', passwordValidation);
      setPasswordError(passwordValidation);
      return;
    }

    console.log('✅ Form validation passed, starting authentication...');
    setLoading(true);
    
    try {
      if (isSignUp) {
        console.log('🔄 Attempting user registration...');
        // 注册新用户
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: 'musictabapp://auth/callback'
          }
        });

        console.log('📋 Registration response:', { data: !!data, error: !!error });
        
        if (error) {
          console.log('❌ Registration error:', error);
          const friendlyError = getFriendlyErrorMessage(error);
          console.log('🔍 Showing error alert:', friendlyError);
          Alert.alert('注册失败', friendlyError);
        } else if (data.user) {
          console.log('✅ T35: Registration successful');
          console.log('📋 T35 DoD Check - access_token:', data.session?.access_token ? 'PRESENT' : 'MISSING');
          
          if (!data.session) {
            console.log('📧 Showing email confirmation alert');
            Alert.alert(
              '注册成功',
              '请检查您的邮箱并点击确认链接来激活您的账户。',
              [
                { text: '确定', onPress: () => setIsSignUp(false) }
              ]
            );
          } else {
            console.log('✅ Auto-login successful, navigating...');
            // 自动登录成功
            router.replace('/');
          }
        }
      } else {
        console.log('🔄 Attempting user login...');
        // 登录现有用户
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        console.log('📋 Login response:', { data: !!data, error: !!error });
        
        if (error) {
          console.log('❌ Login error:', error);
          const friendlyError = getFriendlyErrorMessage(error);
          console.log('🔍 Showing error alert:', friendlyError);
          Alert.alert('登录失败', friendlyError);
        } else if (data.user && data.session) {
          console.log('✅ T35: Login successful');
          console.log('📋 T35 DoD Check - access_token:', data.session?.access_token ? 'PRESENT' : 'MISSING');
          
          // 登录成功
          router.replace('/');
        } else {
          console.log('❌ No session received');
          Alert.alert('登录失败', '未收到会话信息');
        }
      }
    } catch (error) {
      console.log('❌ Exception caught:', error);
      const friendlyError = getFriendlyErrorMessage(error);
      console.log('🔍 Showing exception alert:', friendlyError);
      Alert.alert('错误', friendlyError);
    } finally {
      setLoading(false);
      console.log('🔄 Authentication process completed');
    }
  };

  const handleMagicLink = async () => {
    const emailValidation = validateEmail(email);
    if (emailValidation) {
      setEmailError(emailValidation);
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: 'musictabapp://auth/callback',
        },
      });

      if (error) {
        const friendlyError = getFriendlyErrorMessage(error);
        Alert.alert('错误', friendlyError);
      } else {
        Alert.alert(
          '请检查您的邮箱',
          '我们已向您发送了魔法链接。点击邮件中的链接即可登录。'
        );
      }
    } catch (error) {
      const friendlyError = getFriendlyErrorMessage(error);
      Alert.alert('错误', friendlyError);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    console.log('🔧 Forgot Password button clicked');
    setResetEmail(email); // 预填充当前邮箱
    setResetEmailError(validateEmail(email));
    setShowResetModal(true);
  };

  const handleResetPassword = async () => {
    console.log('🔧 Reset Password submitted');
    console.log('📧 Reset Email:', resetEmail);
    
    const emailValidation = validateEmail(resetEmail);
    if (emailValidation) {
      setResetEmailError(emailValidation);
      return;
    }

    setResetLoading(true);
    console.log('🔄 Starting password reset process...');
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: 'http://localhost:8081/reset-password?type=recovery',
      });

      if (error) {
        console.error('❌ Password reset error:', error);
        const friendlyError = getFriendlyErrorMessage(error);
        Alert.alert('错误', friendlyError);
      } else {
        console.log('✅ Password reset email sent successfully');
        setShowResetModal(false);
        setResetEmail('');
        Alert.alert(
          '密码重置邮件已发送',
          '请检查您的邮箱并点击密码重置链接。您将被重定向到设置新密码的页面。'
        );
      }
    } catch (error) {
      console.error('❌ Password reset exception:', error);
      const friendlyError = getFriendlyErrorMessage(error);
      Alert.alert('错误', friendlyError);
    } finally {
      setResetLoading(false);
      console.log('🔄 Password reset process completed');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Text style={styles.title}>🎵 Sign In</Text>
          <Text style={styles.subtitle}>
            {isSignUp ? '创建您的账户' : '欢迎回来'}
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, emailError && styles.inputError]}
              placeholder="邮箱地址"
              value={email}
              onChangeText={handleEmailChange}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, passwordError && styles.inputError]}
              placeholder="密码"
              value={password}
              onChangeText={handlePasswordChange}
              secureTextEntry
              autoComplete="password"
            />
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          </View>

          {isSignUp && (
            <View style={styles.passwordRequirements}>
              <Text style={styles.requirementsTitle}>密码要求：</Text>
              <Text style={styles.requirement}>• 至少8个字符</Text>
              <Text style={styles.requirement}>• 至少一个小写字母</Text>
              <Text style={styles.requirement}>• 至少一个大写字母</Text>
              <Text style={styles.requirement}>• 至少一个数字</Text>
              <Text style={styles.requirement}>• 至少一个特殊字符 (!@#$%^&*)</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.disabled]}
            onPress={handleEmailAuth}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? '请稍候...' : (isSignUp ? '创建账户' : '登录')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setIsSignUp(!isSignUp);
              // 清除错误状态
              setEmailError('');
              setPasswordError('');
            }}
            disabled={loading}
          >
            <Text style={styles.secondaryText}>
              {isSignUp ? '已有账户？立即登录' : '需要账户？立即注册'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.magicLinkButton}
            onPress={handleMagicLink}
            disabled={loading}
          >
            <Text style={styles.magicLinkText}>使用魔法链接登录</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={() => {
              console.log('🔧 Forgot Password button pressed');
              handleForgotPassword();
            }}
            disabled={loading}
          >
            <Text style={styles.forgotPasswordText}>忘记密码？</Text>
          </TouchableOpacity>

          <Text style={styles.version}>T35 - Email/Password Login with Validation</Text>
        </View>
      </ScrollView>

      {/* Password Reset Modal */}
      <Modal
        visible={showResetModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>重置密码</Text>
            <Text style={styles.modalSubtitle}>
              输入您的邮箱地址以接收密码重置链接
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.modalInput, resetEmailError && styles.inputError]}
                placeholder="邮箱地址"
                value={resetEmail}
                onChangeText={handleResetEmailChange}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              {resetEmailError ? <Text style={styles.errorText}>{resetEmailError}</Text> : null}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowResetModal(false)}
                disabled={resetLoading}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.resetButton, resetLoading && styles.disabled]}
                onPress={handleResetPassword}
                disabled={resetLoading}
              >
                <Text style={styles.resetButtonText}>
                  {resetLoading ? '发送中...' : '发送重置链接'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <StatusBar style="auto" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  inputError: {
    borderColor: '#FF3B30',
    borderWidth: 2,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 5,
    marginLeft: 5,
  },
  passwordRequirements: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  requirement: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    padding: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  secondaryText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  magicLinkButton: {
    padding: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  magicLinkText: {
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  forgotPasswordButton: {
    padding: 10,
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginTop: 10,
  },
  forgotPasswordText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#007AFF',
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
